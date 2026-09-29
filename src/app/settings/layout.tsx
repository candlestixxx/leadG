import Link from 'next/link';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>
        <nav className="space-y-2 text-sm font-medium">
          <Link href="/settings" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Agent Profile</Link>
          <Link href="/settings/integrations" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Integrations</Link>
          <Link href="/settings/scripts" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">AI Call Scripts</Link>
          <Link href="/settings/knowledge" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Knowledge Base</Link>
          <div className="pt-6">
            <Link href="/" className="block px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md">&larr; Back to Dashboard</Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
