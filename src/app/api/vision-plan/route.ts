import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Simulate Claude Vision processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock Scene Spec based on schema in Tech Spec
    const mockSceneSpec = {
      scene_id: `scene_${Date.now()}`,
      footprint: { width_m: 12.0, depth_m: 9.5 },
      rooms: [
        { 
          name: "living", 
          x: 0, 
          z: 0, 
          w: 6.0, 
          d: 5.0 
          // floor_texture will be assigned from project assets
        }
      ],
      walls: [
        { x1: -3, z1: -2.5, x2: 3, z2: -2.5, height_m: 2.7 }, // Back wall
        { x1: -3, z1: 2.5, x2: 3, z2: 2.5, height_m: 2.7 },   // Front wall
        { x1: -3, z1: -2.5, x2: -3, z2: 2.5, height_m: 2.7 }, // Left wall
        { x1: 3, z1: -2.5, x2: 3, z2: 2.5, height_m: 2.7 },   // Right wall
      ],
      openings: [
        { wall: 1, type: "window", material: "glass" } // Window on front wall
      ],
      orientation_deg: 0
    };

    return NextResponse.json({ sceneSpec: mockSceneSpec });
  } catch (error: any) {
    console.error('Error generating scene spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate scene spec' },
      { status: 500 }
    );
  }
}
