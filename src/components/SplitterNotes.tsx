import React, { useState, useEffect } from 'react';
import { StickyNote, Trash2, X } from 'lucide-react';

export interface SplitterNote {
  id: string;
  name: string;
  note: string;
  colorPages: string;
  monoPages: string;
  createdAt: string;
  source: 'manual' | 'auto';
}

const STORAGE_KEY = 'splitter_notes';

function loadNotes(): SplitterNote[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveNotes(notes: SplitterNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

interface SplitterNotesProps {
  onClose?: () => void;
}

const SplitterNotes: React.FC<SplitterNotesProps> = ({ onClose }) => {
  const [notes, setNotes] = useState<SplitterNote[]>(loadNotes);

  useEffect(() => {
    const onStorage = () => setNotes(loadNotes());
    window.addEventListener('splitter-notes-updated', onStorage);
    return () => window.removeEventListener('splitter-notes-updated', onStorage);
  }, []);

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    setNotes(updated);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-800">Saved Notes</h3>
          {notes.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="p-6 text-center">
          <StickyNote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No notes yet. Process a PDF and save it with a name.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {notes.map(note => (
            <div key={note.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-sm truncate">{note.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      note.source === 'auto'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {note.source === 'auto' ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                  {note.note && (
                    <p className="text-sm text-gray-600 mb-2 leading-relaxed">{note.note}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      <span className="font-medium text-blue-600">Color:</span> {note.colorPages || 'None'}
                    </span>
                    <span>
                      <span className="font-medium text-gray-600">Mono:</span> {note.monoPages || 'None'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{note.createdAt}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function addSplitterNote(note: Omit<SplitterNote, 'id' | 'createdAt'>) {
  const notes = loadNotes();
  const newNote: SplitterNote = {
    ...note,
    id: Date.now().toString(),
    createdAt: new Date().toLocaleString(),
  };
  saveNotes([newNote, ...notes]);
  window.dispatchEvent(new Event('splitter-notes-updated'));
}

export default SplitterNotes;
