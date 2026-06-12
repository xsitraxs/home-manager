import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';

// Управление членами семьи
export function FamilyManager() {
  const { members, addMember, deleteMember, renameMember } = useAppStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addMember(newName.trim());
    setNewName('');
  };

  const startEditing = (id: number, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSave = async () => {
    if (editingId === null || !editingName.trim()) return;
    await renameMember(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">👥 Члены семьи</h2>

      {/* Форма добавления */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Имя нового члена семьи"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="btn-primary">
          Добавить
        </button>
      </div>

      {/* Список членов семьи */}
      <div className="space-y-2">
        <AnimatePresence>
          {members.map((member) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="card flex items-center gap-3"
            >
              {/* Аватар */}
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Имя */}
              {editingId === member.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 px-2 py-1 rounded border border-primary bg-white dark:bg-gray-700 focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 font-medium">{member.name}</span>
              )}

              {/* Дата добавления */}
              <span className="text-xs text-gray-500">
                {new Date(member.created_at).toLocaleDateString('ru-RU')}
              </span>

              {/* Кнопки */}
              <button
                onClick={() => startEditing(member.id, member.name)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeletingId(member.id)}
                className="p-1.5 rounded hover:bg-danger/20 text-danger"
              >
                🗑️
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
            <p>Добавьте членов семьи для автоматической ротации дел</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Удалить члена семьи?"
        message="Это действие нельзя отменить."
        onConfirm={() => {
          if (deletingId !== null) deleteMember(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
