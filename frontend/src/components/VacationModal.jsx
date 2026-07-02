import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

function countWorkingDays(startStr, endStr) {
  if (!startStr || !endStr || startStr > endStr) return 0;
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  let count = 0;
  for (let d = new Date(sy, sm - 1, sd); d <= new Date(ey, em - 1, ed); d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export default function VacationModal({ modal, onClose, onSave, onDelete, stats }) {
  const isEdit = modal.mode === 'edit';
  const [form, setForm] = useState({
    start_date: isEdit ? modal.vacation.start_date : (modal.date ?? ''),
    end_date: isEdit ? modal.vacation.end_date : (modal.date ?? ''),
    note: isEdit ? (modal.vacation.note ?? '') : '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const workingDays = useMemo(
    () => countWorkingDays(form.start_date, form.end_date),
    [form.start_date, form.end_date]
  );

  // Days remaining after this entry (subtract current edit's days first)
  const currentEditDays = isEdit
    ? countWorkingDays(modal.vacation.start_date, modal.vacation.end_date)
    : 0;
  const remainingAfter = stats
    ? stats.remaining_days + currentEditDays - workingDays
    : null;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.start_date > form.end_date) {
      return setError('Startdatum muss vor dem Enddatum liegen.');
    }
    setLoading(true);
    try {
      if (isEdit && changeMode) {
        await api.requestVacationChange(modal.vacation.id, form);
      } else if (isEdit) {
        await api.updateVacation(modal.vacation.id, form);
      } else {
        await api.addVacation(form);
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const status = isEdit ? (modal.vacation.status ?? (modal.vacation.is_approved ? 'approved' : 'pending')) : 'pending';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const [changeMode, setChangeMode] = useState(false); // for approved: show edit form

  const handleDelete = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    setLoading(true);
    try {
      await api.deleteVacation(modal.vacation.id);
      onDelete();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-800">
              {isEdit
                ? isRejected ? '✕ Urlaubsantrag abgelehnt'
                : isApproved && changeMode ? '✏️ Änderung beantragen'
                : isApproved ? '✅ Genehmigter Urlaub'
                : '⏳ Urlaub bearbeiten'
                : '+ Urlaub eintragen'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hide form fields for approved vacation when not in change mode */}
            <div className={`grid grid-cols-2 gap-3 ${isApproved && !changeMode ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Von</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={set('start_date')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Bis</label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={set('end_date')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Working days preview */}
            {workingDays > 0 && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
                remainingAfter !== null && remainingAfter < 0
                  ? 'bg-red-50 border border-red-100'
                  : 'bg-indigo-50 border border-indigo-100'
              }`}>
                <span className={remainingAfter !== null && remainingAfter < 0 ? 'text-red-600' : 'text-indigo-700'}>
                  <span className="font-semibold">{workingDays} Arbeitstag{workingDays !== 1 ? 'e' : ''}</span>
                  <span className="text-xs ml-1">(ohne Wochenenden)</span>
                </span>
                {remainingAfter !== null && (
                  <span className={`text-xs font-medium ${remainingAfter < 0 ? 'text-red-500' : 'text-indigo-500'}`}>
                    → noch {remainingAfter} übrig
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Notiz <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.note}
                onChange={set('note')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                placeholder="z.B. Familienurlaub"
                maxLength={100}
              />
            </div>

            {isRejected && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <p className="font-semibold mb-1">Dein Urlaubsantrag wurde abgelehnt.</p>
                <p className="text-red-600 text-xs">Passe die Daten an und stelle den Antrag erneut.</p>
              </div>
            )}
            {isApproved && !changeMode && (
              <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm">Genehmigt — Änderung nötig?</span>
                <button onClick={() => setChangeMode(true)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
                  Änderung beantragen
                </button>
              </div>
            )}
            {isApproved && changeMode && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-3 py-2">
                Das Original bleibt genehmigt bis der Admin die Änderung freigibt.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {isEdit && (isRejected || !isApproved) && !isApproved && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className={`text-sm px-4 py-2.5 rounded-xl font-medium transition-colors ${
                    confirmDelete
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'text-red-500 border border-red-200 hover:bg-red-50'
                  }`}
                >
                  {confirmDelete ? 'Wirklich?' : 'Löschen'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-sm py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              {(!isApproved || changeMode) && !isRejected && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading ? '...' : changeMode ? 'Änderung einreichen' : isEdit ? 'Erneut beantragen' : 'Beantragen'}
                </button>
              )}
              {isRejected && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading ? '...' : 'Erneut beantragen'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
