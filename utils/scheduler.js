import Post from '../models/Post.js';

export const publishScheduledPosts = async () => {
  try {
    const posts = await Post.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    });
    for (const post of posts) {
      post.status = 'published';
      post.publishedAt = post.scheduledAt;
      await post.save();
      console.log(`Published scheduled post: "${post.title}"`);
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
};