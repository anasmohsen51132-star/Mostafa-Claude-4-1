import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, Lock, Play, List, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCourse, useCourseLectures, useUpdateProgress } from '@/shared/hooks/useApi';
import { lecturesApi } from '@/shared/api/endpoints';
import { queryKeys } from '@/shared/lib/queryClient';
import { formatDuration } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';
import { Spinner } from '@/shared/components/ui/PageLoader';

export default function LecturePlayerPage() {
  const { courseSlug, lectureId } = useParams<{ courseSlug: string; lectureId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  const { data: course } = useCourse(courseSlug!);
  const { data: sections, isLoading: sectionsLoading } = useCourseLectures(course?.id || '');
  const updateProgress = useUpdateProgress();

  const { data: lecture, isLoading: lectureLoading } = useQuery({
    queryKey: queryKeys.lectures.detail(lectureId!),
    queryFn: () => lecturesApi.getLecture(lectureId!).then((r) => r.data.data),
    enabled: !!lectureId,
  });

  // Track watch progress every 10 seconds
  useEffect(() => {
    if (!videoRef.current || !course?.id || !lectureId) return;
    const video = videoRef.current;

    const save = () => {
      if (video.currentTime > 5 && course.id) {
        updateProgress.mutate({
          courseId: course.id,
          lectureId: lectureId!,
          watchedSeconds: Math.floor(video.currentTime),
        });
      }
    };

    progressTimer.current = setInterval(save, 10_000);
    video.addEventListener('ended', save);

    return () => {
      clearInterval(progressTimer.current);
      video.removeEventListener('ended', save);
    };
  }, [lectureId, course?.id]);

  // Flatten all lectures for prev/next navigation
  const allLectures = sections?.flatMap((s: any) => s.lectures) ?? [];
  const currentIndex = allLectures.findIndex((l: any) => l.id === lectureId);
  const prevLecture = allLectures[currentIndex - 1];
  const nextLecture = allLectures[currentIndex + 1];

  if (lectureLoading && !lecture) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-black text-white flex items-center gap-4 px-4 py-3 flex-shrink-0">
        <button onClick={() => navigate(`/courses/${courseSlug}`)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{course?.title}</p>
          <p className="text-sm font-medium text-white truncate">{lecture?.title}</p>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden">
          <List className="w-5 h-5" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="bg-black aspect-video w-full relative">
            {lecture?.videoUrl ? (
              <video
                ref={videoRef}
                src={lecture.videoUrl}
                controls
                className="video-player w-full h-full"
                autoPlay
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Play className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    {lecture?.videoStatus === 'processing' ? 'جاري معالجة الفيديو...' : 'الفيديو غير متاح'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lecture info + nav */}
          <div className="bg-white flex-1 p-6">
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-gray-900 mb-3">{lecture?.title}</h1>
              {lecture?.description && (
                <p className="text-gray-600 leading-relaxed mb-6">{lecture.description}</p>
              )}

              {/* Prev / Next */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  disabled={!prevLecture}
                  onClick={() => prevLecture && navigate(`/learn/${courseSlug}/lecture/${prevLecture.id}`)}
                  className="btn btn-secondary btn-sm disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" /> السابق
                </button>
                <button
                  disabled={!nextLecture}
                  onClick={() => nextLecture && navigate(`/learn/${courseSlug}/lecture/${nextLecture.id}`)}
                  className="btn btn-primary btn-sm disabled:opacity-40"
                >
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar curriculum */}
        <>
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <aside className={cn(
            'w-80 bg-white border-r border-gray-100 flex-col overflow-y-auto flex-shrink-0',
            'fixed inset-y-0 left-0 z-40 lg:relative lg:flex',
            sidebarOpen ? 'flex' : 'hidden lg:flex',
          )}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">محتوى الكورس</h2>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sectionsLoading ? (
              <div className="flex items-center justify-center py-8"><Spinner /></div>
            ) : (
              <div className="overflow-y-auto">
                {sections?.map((section: any) => (
                  <div key={section.id}>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-600 uppercase">{section.title}</p>
                    </div>
                    {section.lectures.map((lec: any) => {
                      const isCurrent = lec.id === lectureId;
                      const isCompleted = lec.progress?.[0]?.isCompleted;
                      const isLocked = !lec.isFree && !lec.videoUrl;
                      return (
                        <button
                          key={lec.id}
                          onClick={() => { if (!isLocked) { navigate(`/learn/${courseSlug}/lecture/${lec.id}`); setSidebarOpen(false); } }}
                          disabled={isLocked}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-right border-b border-gray-50 transition-colors',
                            isCurrent ? 'bg-primary/10' : 'hover:bg-gray-50',
                            isLocked && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : isLocked
                                ? <Lock className="w-4 h-4 text-gray-300" />
                                : <div className={cn('w-4 h-4 rounded-full border-2', isCurrent ? 'border-primary bg-primary' : 'border-gray-300')} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm leading-snug line-clamp-2',
                              isCurrent ? 'font-semibold text-primary' : 'text-gray-700'
                            )}>
                              {lec.title}
                            </p>
                            {lec.videoDuration > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">{formatDuration(lec.videoDuration)}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </>
      </div>
    </div>
  );
}
