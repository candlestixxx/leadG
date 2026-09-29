import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine the user's Twilio settings
    const settings = await prisma.integrationSettings.findMany({
        where: { userId: user.id, provider: { in: ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number', 'twilio_twiml_app_sid', 'twilio_api_key', 'twilio_api_secret'] } }
    });

    const getSetting = (key: string) => settings.find(s => s.provider === key)?.apiKey;

    const accountSid = getSetting('twilio_account_sid') || process.env.TWILIO_ACCOUNT_SID;
    const apiKey = getSetting('twilio_api_key') || process.env.TWILIO_API_KEY;
    const apiSecret = getSetting('twilio_api_secret') || process.env.TWILIO_API_SECRET;
    const twimlAppSid = getSetting('twilio_twiml_app_sid') || process.env.TWILIO_TWIML_APP_SID;
    const outgoingApplicationSid = twimlAppSid;

    if (!accountSid || !apiKey || !apiSecret || !outgoingApplicationSid) {
        return NextResponse.json({ error: 'Missing Twilio configuration for Voice SDK. Please ensure Account SID, API Key, API Secret, and TwiML App SID are set.' }, { status: 500 });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: outgoingApplicationSid,
        incomingAllow: true, // Optional: allow incoming calls
    });

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const token = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { identity: user.id } // Set identity to user ID to receive incoming calls
    );
    token.addGrant(voiceGrant);

    // Serialize the token to a JWT string
    return NextResponse.json({ token: token.toJwt() });
  } catch (error: any) {
    console.error("Error generating Twilio token:", error);
    return NextResponse.json({ error: error.message || 'Failed to generate token' }, { status: 500 });
  }
}
