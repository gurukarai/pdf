export default function BulkIDGenerator() {
  return (
    <div style={{ height: 'calc(100vh - 200px)', minHeight: '700px' }}>
      <iframe
        src="/bulk-id.html"
        className="w-full h-full"
        title="Bulk ID Card Generator"
        style={{ border: 'none', display: 'block' }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
