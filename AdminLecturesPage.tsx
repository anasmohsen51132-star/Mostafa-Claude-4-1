import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useCourseLectures, useCourseById, useCreateLecture, useUpdateLecture } from '@/shared/hooks/useApi';
import { lecturesApi } from '@/shared/api/endpoints';
import { queryClient, queryKeys } from '@/shared/lib/queryClient';
import { Spinner, Skeleton } from '@/shared/components/ui/PageLoader';
import { formatDuration } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';
import toast from 'react-hot-toast';

export default function AdminLecturesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: course } = useCourseById(courseId!);
  const { data: sections, isLoading } = useCourseLectures(courseId!);
  const createLecture = useCreateLecture();
  const updateLecture = useUpdateLecture();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [addingLecture, setAddingLecture] = useState<string | null>(null);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  const toggleSection = (id: string) =>
    setExpandedSections(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    setCreatingSection(true);
    try {
      await lecturesApi.createSection({ courseId, title: newSectionTitle.trim(), sortOrder: (sections?.length ?? 0) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.lectures.byCourse(courseId!) });
      setNewSectionTitle('');
      setAddingSection(false);
      toast.success('تم إضافة القسم');
    } catch { toast.error('فشل إضافة القسم'); }
    finally { setCreatingSection(false); }
  };

  const handleAddLecture = (sectionId: string) => {
    if (!newLectureTitle.trim()) return;
    const sectionLectures = sections?.find((s: any) => s.id === sectionId)?.lectures ?? [];
    createLecture.mutate(
      { courseId: courseId!, sectionId, title: newLectureTitle.trim(), sortOrder: sectionLectures.length },
      {
        onSuccess: () => {
          setNewLectureTitle('');
          setAddingLecture(null);
          toast.success('تم إضافة المحاضرة');
        },
      },
    );
  };

  const handleTogglePublish = (lectureId: string, isPublished: boolean) => {
    updateLecture.mutate({ id: lectureId, data: { isPublished: !isPublished } });
  };

  const handleToggleFree = (lectureId: string, isFree: boolean) => {
    updateLecture.mutate({ id: lectureId, data: { isFree: !isFree } });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/courses')} className="btn btn-ghost btn-sm">← رجوع</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">المحاضرات</h1>
          {course && <p className="text-sm text-gray-500">{course.title}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-4">
          {(sections ?? []).map((section: any) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div key={section.id} className="card overflow-hidden">
                {/* Section header */}
                <div
                  className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{section.title}</p>
                    <p className="text-xs text-gray-500">{section.lectures.length} محاضرة</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>

                {isExpanded && (
                  <div>
                    {section.lectures.map((lecture: any) => (
                      <div key={lecture.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
                        <GripVertical className="w-4 h-4 text-gray-200 flex-shrink-0" />
                        <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{lecture.title}</p>
                          <p className="text-xs text-gray-400">
                            {lecture.videoDuration > 0 ? formatDuration(lecture.videoDuration) : 'لا يوجد فيديو'}
                            {' · '}
                            <span className={lecture.videoStatus === 'ready' ? 'text-green-600' : 'text-yellow-600'}>
                              {lecture.videoStatus === 'ready' ? '✓ جاهز' : lecture.videoStatus === 'processing' ? '⏳ معالجة' : lecture.videoStatus}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleFree(lecture.id, lecture.isFree)}
                            className={cn('text-xs px-2 py-1 rounded-lg transition-colors', lecture.isFree ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                          >
                            {lecture.isFree ? 'مجاني' : 'مدفوع'}
                          </button>
                          <button
                            onClick={() => handleTogglePublish(lecture.id, lecture.isPublished)}
                            className={cn('text-xs px-2 py-1 rounded-lg transition-colors', lecture.isPublished ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}
                          >
                            {lecture.isPublished ? 'منشور' : 'مخفي'}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add lecture input */}
                    {addingLecture === section.id ? (
                      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-primary/5">
                        <input
                          autoFocus
                          value={newLectureTitle}
                          onChange={e => setNewLectureTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddLecture(section.id); if (e.key === 'Escape') setAddingLecture(null); }}
                          placeholder="عنوان المحاضرة..."
                          className="input flex-1 text-sm py-2"
                        />
                        <button onClick={() => handleAddLecture(section.id)} disabled={createLecture.isPending} className="btn btn-primary btn-sm">
                          {createLecture.isPending ? <Spinner size="sm" /> : 'إضافة'}
                        </button>
                        <button onClick={() => setAddingLecture(null)} className="btn btn-ghost btn-sm">إلغاء</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingLecture(section.id); setExpandedSections(s => new Set([...s, section.id])); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-50">
                        <Plus className="w-4 h-4" /> إضافة محاضرة
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add section */}
          {addingSection ? (
            <div className="card p-4 border-2 border-dashed border-primary/40">
              <input autoFocus value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setAddingSection(false); }}
                placeholder="عنوان القسم..." className="input mb-3" />
              <div className="flex gap-2">
                <button onClick={handleAddSection} disabled={creatingSection} className="btn btn-primary btn-sm">
                  {creatingSection ? <Spinner size="sm" /> : 'إضافة القسم'}
                </button>
                <button onClick={() => setAddingSection(false)} className="btn btn-ghost btn-sm">إلغاء</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingSection(true)}
              className="w-full card border-2 border-dashed border-gray-200 p-4 text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> إضافة قسم جديد
            </button>
          )}
        </div>
      )}
    </div>
  );
}
