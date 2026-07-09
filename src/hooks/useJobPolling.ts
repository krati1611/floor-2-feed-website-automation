import { useState, useCallback, useRef } from 'react';

type JobStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

interface PollingOptions {
  intervalMs?: number;
  maxAttempts?: number;
}

export function useJobPolling<TResult = any>() {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef<number>(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startJob = useCallback(
    async (
      submitFn: () => Promise<string>, // returns job_id
      checkStatusFn: (job_id: string) => Promise<{ status: string; result?: TResult; progress?: number }>,
      options?: PollingOptions
    ) => {
      setStatus('submitting');
      setError(null);
      setResult(null);
      setProgress(0);
      attemptsRef.current = 0;
      clearTimer();

      try {
        const jobId = await submitFn();
        
        setStatus('polling');
        setProgress(10); // initial progress after submit

        const poll = async () => {
          attemptsRef.current += 1;
          
          try {
            const statusResponse = await checkStatusFn(jobId);
            
            if (statusResponse.status === 'done') {
              setStatus('done');
              setProgress(100);
              setResult(statusResponse.result as TResult);
              clearTimer();
            } else if (statusResponse.status === 'error') {
              setStatus('error');
              setError('Job failed during processing.');
              clearTimer();
            } else {
              // still running
              if (statusResponse.progress) {
                setProgress(statusResponse.progress);
              } else {
                // simulate progress if not provided by backend
                setProgress((prev) => Math.min(prev + 5, 95));
              }

              const maxAttempts = options?.maxAttempts || 60; // default 1 min if 1s interval
              if (attemptsRef.current >= maxAttempts) {
                setStatus('error');
                setError('Job timed out.');
                clearTimer();
              } else {
                const interval = options?.intervalMs || 2000;
                timerRef.current = setTimeout(poll, interval);
              }
            }
          } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Error checking job status');
            clearTimer();
          }
        };

        // start polling
        timerRef.current = setTimeout(poll, options?.intervalMs || 2000);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to submit job');
      }
    },
    []
  );

  const reset = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  return { status, error, result, progress, startJob, reset };
}
