import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('job_id');

  if (!jobId) {
    return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
  }

  try {
    // Parse the start time from the stateless job_id: job_{timestamp}_{hash}
    const parts = jobId.split('_');
    if (parts.length < 3) {
      return NextResponse.json({ error: 'Invalid job_id format' }, { status: 400 });
    }

    const startTime = parseInt(parts[1], 10);
    const elapsed = Date.now() - startTime;
    
    // Simulate 8 seconds of processing time
    const processingTime = 8000;

    if (elapsed < processingTime) {
      // Still running
      const progress = Math.min(Math.floor((elapsed / processingTime) * 100), 95);
      return NextResponse.json({ status: 'running', progress });
    } else {
      // Done! Return mock generated images
      // We return 4 variants as per the spec for the "gallery" pick
      const mockResult = {
        variants: [
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
          'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80'
        ]
      };

      return NextResponse.json({ status: 'done', result: mockResult });
    }

  } catch (error: any) {
    console.error('Error polling job status:', error);
    return NextResponse.json(
      { error: 'Failed to poll job status' },
      { status: 500 }
    );
  }
}
