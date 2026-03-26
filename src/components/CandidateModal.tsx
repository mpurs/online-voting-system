import React, { useState, useRef } from 'react';
import { X, Upload, User, Award, Image as ImageIcon } from 'lucide-react';
import { Candidate } from '@/src/types';

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (candidate: Partial<Candidate>) => void;
  candidate?: Candidate | null;
}

export default function CandidateModal({ isOpen, onClose, onSave, candidate }: CandidateModalProps) {
  const [name, setName] = useState(candidate?.name || '');
  const [position, setPosition] = useState(candidate?.position || 'President');
  const [imageUrl, setImageUrl] = useState(candidate?.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, position, imageUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900">
            {candidate ? 'Edit Candidate' : 'Add New Candidate'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center">
              <div 
                onClick={triggerFileInput}
                className="group relative h-32 w-32 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 transition-all hover:border-indigo-500 hover:bg-indigo-50"
              >
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-neutral-400 group-hover:text-indigo-600">
                    <ImageIcon size={32} />
                    <span className="mt-2 text-xs font-medium">Upload Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="text-white" size={24} />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <p className="mt-2 text-xs text-neutral-500">Click to upload candidate photo</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Full Name</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g. Alice Johnson"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Position</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <Award size={18} />
                </div>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm appearance-none"
                >
                  <option value="President">President</option>
                  <option value="Vice President">Vice President</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Treasurer">Treasurer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Image URL (Optional)</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <Upload size={18} />
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              Save Candidate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
