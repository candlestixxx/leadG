// State Variables
let currentLead = null;
let callActive = false;
let callDurationInterval = null;
let durationSeconds = 0;
let callLogs = [];

// DOM Elements
const modeToggle = document.getElementById('mode-toggle');
const advancedSettings = document.getElementById('advanced-settings');
const simpleSettings = document.getElementById('simple-settings');
const modeAdvancedLabel = document.getElementById('mode-advanced-label');
const voiceTemp = document.getElementById('voice-temp');
const tempVal = document.getElementById('temp-val');
const btnDispatch = document.getElementById('btn-dispatch');
const ringContainer = document.getElementById('ring-container');
const statusTitle = document.getElementById('status-title');
const statusDesc = document.getElementById('status-desc');
const callTimer = document.getElementById('call-timer');
const transcriptStream = document.getElementById('transcript-stream');
const callActionsRow = document.getElementById('call-actions-row');
const liveBadge = document.getElementById('live-badge');
const phoneIcon = document.getElementById('phone-icon');
const leadForm = document.getElementById('lead-form');
const btnCloseLogs = document.getElementById('btn-close-logs');
const callLogsPanel = document.getElementById('call-logs-panel');
const navLogs = document.getElementById('nav-logs');
const logsTableBody = document.getElementById('logs-table-body');
const btnActionTransfer = document.getElementById('btn-action-transfer');
const btnActionHangup = document.getElementById('btn-action-hangup');

// Preset Configurations Map
const voicePresets = {
    'female-us': {
        gender: 'female',
        provider: '11labs',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        characteristics: ['polite', 'professional', 'clear']
    },
    'male-us': {
        gender: 'male',
        provider: '11labs',
        voiceId: 'AZnzlk1XvdvUeBnXmlld',
        characteristics: ['confident', 'persuasive', 'acquisitions']
    },
    'female-uk': {
        gender: 'female',
        provider: '11labs',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        characteristics: ['energetic', 'friendly', 'british']
    }
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    // Mode Switch Handler (Simple vs. Advanced)
    modeToggle.addEventListener('change', () => {
        if (modeToggle.checked) {
            // Advanced Mode Active
            advancedSettings.classList.remove('hidden');
            simpleSettings.classList.add('hidden');
            modeAdvancedLabel.classList.add('active-glow');
            document.getElementById('page-subtitle').textContent = "Configure advanced system keys, raw system prompts and model values.";
        } else {
            // Simple Mode Active
            advancedSettings.classList.add('hidden');
            simpleSettings.classList.remove('hidden');
            modeAdvancedLabel.classList.remove('active-glow');
            document.getElementById('page-subtitle').textContent = "Configure and dispatch human-like calling sessions in seconds.";
        }
    });

    // Voice card preset selection
    const presetCards = document.querySelectorAll('.voice-preset-card');
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            presetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Sync with advanced inputs if needed
            const selectedKey = card.getAttribute('data-voice');
            const data = voicePresets[selectedKey];
            if (data) {
                document.getElementById('voice-provider').value = data.provider;
                document.getElementById('voice-id').value = data.voiceId;
            }
        });
    });

    // Temperature slider updating
    voiceTemp.addEventListener('input', (e) => {
        tempVal.textContent = e.target.value;
    });

    // Event Bindings
    btnDispatch.addEventListener('click', handleDispatch);
    btnActionHangup.addEventListener('click', terminateActiveCall);
    btnActionTransfer.addEventListener('click', executeCallTransfer);
    navLogs.addEventListener('click', openLogsPanel);
    btnCloseLogs.addEventListener('click', () => callLogsPanel.classList.add('hidden'));

    // Set Default System Prompt in Advanced settings
    document.getElementById('system-prompt').value = `# SYSTEM PROMPT: ACQUISITIONS PRO
- Voice sound should be {characteristics} and pacing natural.
- Goal: Assess if the seller owns the target property and qualify their motivation.
- Warm Handoff: Trigger call transfer if highly motivated.`;

    loadCallLogs();
});

// Outbound Call Dispatch Workflow
async function handleDispatch(e) {
    e.preventDefault();
    if (callActive) return;

    // Validate inputs
    const firstName = document.getElementById('lead-firstname').value;
    const lastName = document.getElementById('lead-lastname').value;
    const phone = document.getElementById('lead-phone').value;
    const address = document.getElementById('lead-address').value;

    if (!firstName || !lastName || !phone) {
        alert("Please fill in the target lead Name and Phone number before dispatching.");
        return;
    }

    currentLead = { firstName, lastName, phone, address };

    // Update UI Status to Ringing
    callActive = true;
    btnDispatch.disabled = true;
    btnDispatch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing Gateway...';
    
    setCallOperationUI('ringing', 'Dialing Carrier...', `Connecting outbound session to ${firstName} ${lastName}...`);
    
    // Simulate Outbound Calling Workflow
    setTimeout(() => {
        if (!callActive) return;
        setCallOperationUI('connected', 'Call Connected', 'Agent is in live call session.');
        startCallTimer();
        startConversationalSimulation();
    }, 3500);
}

// Set Operations Screen Display
function setCallOperationUI(status, title, desc) {
    ringContainer.className = `phone-ring-container ${status}`;
    statusTitle.textContent = title;
    statusDesc.textContent = desc;

    if (status === 'ringing') {
        phoneIcon.className = "fa-solid fa-phone-volume fa-shake";
        liveBadge.classList.remove('hidden');
        callActionsRow.classList.add('hidden');
        transcriptStream.innerHTML = '<div class="system-message">Dialing carrier network... establishing low-latency audio link.</div>';
    } else if (status === 'connected') {
        phoneIcon.className = "fa-solid fa-phone";
        callActionsRow.classList.remove('hidden');
    } else if (status === 'idle') {
        phoneIcon.className = "fa-solid fa-phone";
        liveBadge.classList.add('hidden');
        callActionsRow.classList.add('hidden');
        btnDispatch.disabled = false;
        btnDispatch.innerHTML = '<i class="fa-solid fa-phone-flip"></i> Dispatch Outbound Agent';
    }
}

// Simulating Timer
function startCallTimer() {
    callTimer.classList.remove('hidden');
    durationSeconds = 0;
    callTimer.textContent = "00:00";
    callDurationInterval = setInterval(() => {
        durationSeconds++;
        const mins = String(Math.floor(durationSeconds / 60)).padStart(2, '0');
        const secs = String(durationSeconds % 60).padStart(2, '0');
        callTimer.textContent = `${mins}:${secs}`;
    }, 1000);
}

// Conversation Simulation Stream (Human-like pacing)
const conversationScript = [
    { delay: 1500, speaker: 'agent', text: "Hi, is this {first_name}? Hi, this is Alex." },
    { delay: 3500, speaker: 'lead', text: "Yes, this is John. Who is calling?" },
    { delay: 5500, speaker: 'agent', text: "Hi John. I know this is out of the blue, but I was looking at public property listings near {address} and wanted to see if you have thought about selling or receiving a cash offer on that house?" },
    { delay: 10500, speaker: 'lead', text: "Wait... my house? I mean, everything is for sale for the right price, I suppose. Why do you ask?" },
    { delay: 14500, speaker: 'agent', text: "Totally makes sense! We represent a group of local acquisitions buyers looking to invest directly in the area, which means no listing fees or real estate commissions for you. How would you describe the general condition of the roof and AC?" },
    { delay: 20000, speaker: 'lead', text: "The roof is only 3 years old, and the air conditioning is brand new. It's in excellent shape. What kind of offer can you write?" },
    { delay: 25000, speaker: 'agent', text: "That sounds like a beautiful property, John! I'd love to get you an exact valuation number, but I want to be 100% fair and accurate. I can bring my senior acquisitions manager onto the line right now. It takes about 2 minutes to review. Can I do a quick transfer?" },
    { delay: 31000, speaker: 'lead', text: "Sure, go ahead and connect me. I'll chat with them." },
    { delay: 35000, speaker: 'agent', text: "Awesome! Connecting you now, hold on one second..." }
];

let simTimeouts = [];

function startConversationalSimulation() {
    transcriptStream.innerHTML = '';
    
    conversationScript.forEach(step => {
        const timeout = setTimeout(() => {
            if (!callActive) return;
            
            // Format dynamic tags
            let text = step.text
                .replace('{first_name}', currentLead.firstName)
                .replace('{address}', currentLead.address || "your neighborhood");

            appendSpeechBubble(step.speaker, text);
            
            // Auto transfer at end of script
            if (step.delay === 35000) {
                setTimeout(() => {
                    if (callActive) executeCallTransfer();
                }, 3000);
            }
        }, step.delay);
        
        simTimeouts.push(timeout);
    });
}

// Append bubble to transcript stream
function appendSpeechBubble(speaker, text) {
    const bubble = document.createElement('div');
    bubble.className = `speech-bubble ${speaker}`;
    
    const label = document.createElement('span');
    label.className = 'speech-label';
    label.textContent = speaker === 'agent' ? 'Nexus AI Assistant' : `${currentLead.firstName} (Lead)`;
    
    const content = document.createElement('span');
    content.textContent = text;
    
    bubble.appendChild(label);
    bubble.appendChild(content);
    transcriptStream.appendChild(bubble);
    
    // Auto scroll
    transcriptStream.scrollTop = transcriptStream.scrollHeight;
}

// Warm Transfer Simulation
function executeCallTransfer() {
    if (!callActive) return;
    
    // Clear simulation timeouts
    simTimeouts.forEach(clearTimeout);
    
    setCallOperationUI('ringing', 'Initiating Warm Transfer...', `Routing active call to ${document.getElementById('transfer-number').value}...`);
    appendSpeechBubble('agent', "[SYSTEM: Directing live warm-transfer tool call...]");
    
    setTimeout(() => {
        if (!callActive) return;
        appendSpeechBubble('agent', "[SYSTEM: Transfer Connection Established. Acquisitions Manager joined.]");
        setCallOperationUI('connected', 'Live Handoff Connected', 'Sales team is now connected to the lead.');
        
        // Let it run for 5 more seconds then complete
        setTimeout(() => {
            if (callActive) saveCompletedCallLog("WARM_TRANSFER");
        }, 5000);
    }, 3000);
}

// Hangup and Close
function terminateActiveCall() {
    if (!callActive) return;
    saveCompletedCallLog("COMPLETED");
}

// Save Call Log
function saveCompletedCallLog(disposition) {
    callActive = false;
    
    // Clear timeouts and interval
    simTimeouts.forEach(clearTimeout);
    clearInterval(callDurationInterval);
    callTimer.classList.add('hidden');
    
    setCallOperationUI('idle', 'Call Finished', `Session ended with status: ${disposition}`);
    
    // Add call log entry
    const log = {
        name: `${currentLead.firstName} ${currentLead.lastName}`,
        phone: currentLead.phone,
        date: new Date().toLocaleString(),
        duration: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
        disposition: disposition
    };
    
    callLogs.unshift(log);
    saveLogsToLocalStorage();
    
    // Add system feedback bubble
    const sysMsg = document.createElement('div');
    sysMsg.className = 'system-message';
    sysMsg.textContent = `Call hung up. Duration: ${log.duration}. Saved Log.`;
    transcriptStream.appendChild(sysMsg);
    transcriptStream.scrollTop = transcriptStream.scrollHeight;
}

// Local Storage for Logs
function saveLogsToLocalStorage() {
    localStorage.setItem('nexus_call_logs', JSON.stringify(callLogs));
}

function loadCallLogs() {
    const stored = localStorage.getItem('nexus_call_logs');
    if (stored) {
        callLogs = JSON.parse(stored);
    } else {
        // Seed default logs
        callLogs = [
            { name: "Robert Pelloni", phone: "+15554329876", date: "6/25/2026, 4:10 PM", duration: "1m 45s", disposition: "COMPLETED" },
            { name: "Jake G", phone: "+15558901234", date: "6/24/2026, 11:30 AM", duration: "2m 10s", disposition: "WARM_TRANSFER" }
        ];
        saveLogsToLocalStorage();
    }
}

// Overlay Log Manager Page
function openLogsPanel(e) {
    e.preventDefault();
    loadCallLogs();
    
    logsTableBody.innerHTML = '';
    
    callLogs.forEach((log, index) => {
        const row = document.createElement('tr');
        
        let dispClass = 'completed';
        if (log.disposition === 'WARM_TRANSFER') dispClass = 'transfer';
        if (log.disposition === 'FAILED') dispClass = 'failed';
        
        row.innerHTML = `
            <td><strong>${log.name}</strong></td>
            <td>${log.phone}</td>
            <td>${log.date}</td>
            <td>${log.duration}</td>
            <td><span class="disposition-badge ${dispClass}">${log.disposition}</span></td>
            <td><button class="btn-log-action" onclick="playMockRecording(${index})"><i class="fa-solid fa-play"></i> Play Call</button></td>
        `;
        logsTableBody.appendChild(row);
    });
    
    callLogsPanel.classList.remove('hidden');
}

// Recording Play Simulator
window.playMockRecording = function(index) {
    const log = callLogs[index];
    alert(`Streaming recorded audio payload for call ID ${index + 100} (${log.name}).\nFeature is ready for Twilio/Vapi bucket stream sync.`);
};
