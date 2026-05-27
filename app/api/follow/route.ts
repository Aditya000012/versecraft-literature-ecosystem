import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { action, followerUid, targetUid } = await request.json();

    if (!action || !followerUid || !targetUid) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const followerRef = doc(db, 'users', followerUid);
    const targetRef = doc(db, 'users', targetUid);

    if (action === 'follow') {
      // Add targetUid to followerUid's following array using arrayUnion
      await updateDoc(followerRef, {
        following: arrayUnion(targetUid)
      });
      // Add followerUid to targetUid's followers array using arrayUnion
      await updateDoc(targetRef, {
        followers: arrayUnion(followerUid)
      });
    } else if (action === 'unfollow') {
      // Remove targetUid from followerUid's following array using arrayRemove
      await updateDoc(followerRef, {
        following: arrayRemove(targetUid)
      });
      // Remove followerUid from targetUid's followers array using arrayRemove
      await updateDoc(targetRef, {
        followers: arrayRemove(followerUid)
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in follow system API:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
