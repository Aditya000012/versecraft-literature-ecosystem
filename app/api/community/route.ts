import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Comment {
  uid: string;
  displayName: string;
  content: string;
  createdAt: string;
}

interface CommunityPost {
  id: string;
  uid: string;
  displayName: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  likes: string[];
  reports: string[];
  comments: Comment[];
  flagged: boolean;
  hidden: boolean;
}

export async function GET() {
  try {
    const q = query(
      collection(db, 'communityPosts'),
      where('flagged', '==', false),
      where('hidden', '==', false)
    );
    const querySnap = await getDocs(q);
    const posts: CommunityPost[] = [];
    
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      posts.push({
        id: docSnap.id,
        uid: data.uid || '',
        displayName: data.displayName || '',
        title: data.title || '',
        content: data.content || '',
        type: data.type || 'original',
        likes: data.likes || [],
        reports: data.reports || [],
        comments: data.comments || [],
        flagged: data.flagged || false,
        hidden: data.hidden || false,
        createdAt: data.createdAt?.toDate 
          ? data.createdAt.toDate().toISOString() 
          : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString())
      });
    });

    // In-memory sort to bypass composite index constraints
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const sliced = posts.slice(0, 50);

    return NextResponse.json(sliced);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error fetching posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, displayName, content, type, title } = await request.json();

    if (!uid || !displayName || !content || !type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, 'communityPosts'), {
      uid,
      displayName,
      content,
      type,
      title,
      createdAt: serverTimestamp(),
      likes: [],
      reports: [],
      comments: [],
      flagged: false,
      hidden: false,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error creating post' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { action, postId, uid, comment, displayName, newTitle, newContent } = await request.json();

    if (!action || !postId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const postRef = doc(db, 'communityPosts', postId);

    if (action === 'editPost') {
      if (!newTitle || !newContent) {
        return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
      }
      await updateDoc(postRef, {
        title: newTitle,
        content: newContent
      });
      return NextResponse.json({ success: true });
    }

    // For other actions, we still require uid
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    if (action === 'like') {
      await updateDoc(postRef, {
        likes: arrayUnion(uid)
      });
    } else if (action === 'unlike') {
      await updateDoc(postRef, {
        likes: arrayRemove(uid)
      });
    } else if (action === 'report') {
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      
      const postData = postSnap.data();
      const currentReports = postData.reports || [];
      
      if (!currentReports.includes(uid)) {
        const updatedReports = [...currentReports, uid];
        const shouldFlag = updatedReports.length >= 5;
        
        await updateDoc(postRef, {
          reports: arrayUnion(uid),
          ...(shouldFlag ? { flagged: true, hidden: true } : {})
        });
      }
    } else if (action === 'comment') {
      if (!comment) {
        return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
      }

      await updateDoc(postRef, {
        comments: arrayUnion({
          uid,
          displayName: displayName || 'Anonymous Reader',
          content: comment,
          createdAt: new Date().toISOString()
        })
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in post interaction:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error in post interaction' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { postId, adminUid, uid } = await request.json();

    if (!postId || (!adminUid && !uid)) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const postRef = doc(db, 'communityPosts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postSnap.data();

    const isModerator = adminUid === 'AGUsKuZPq7YFBydMnnOnUcFhvdx1';
    const isOwner = uid && postData.uid === uid;

    if (!isModerator && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    await deleteDoc(postRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error deleting post' }, { status: 500 });
  }
}
