import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, projectId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // This is a MOCK implementation of a submission to an image generation engine
    // (e.g. Nano Banana Pro or ComfyUI).
    // In a real implementation, we would call the external API here.
    
    // We encode the start time in the job_id so we can do stateless polling simulation
    const startTime = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 10);
    const jobId = `job_${startTime}_${randomHash}`;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ job_id: jobId });
  } catch (error: any) {
    console.error('Error submitting image generation job:', error);
    return NextResponse.json(
      { error: 'Failed to submit job to engine' },
      { status: 500 }
    );
  }
}
