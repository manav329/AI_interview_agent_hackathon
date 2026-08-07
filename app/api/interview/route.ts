import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Interview API ready.' });
}

export async function POST() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}
