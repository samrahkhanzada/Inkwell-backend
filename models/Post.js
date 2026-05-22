import mongoose from 'mongoose';
import slugify from 'slugify';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    unique: true,
  },
  excerpt: {
    type: String,
    maxlength: 500,
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  featuredImage: {
    type: String,
    default: '',
  },
  featuredImagePublicId: {
    type: String,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'archived'],
    default: 'draft',
  },
  scheduledAt: {
    type: Date,
  },
  publishedAt: {
    type: Date,
  },
  views: {
    type: Number,
    default: 0,
  },
  readTime: {
    type: Number,
    default: 1,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  allowComments: {
    type: Boolean,
    default: true,
  },
  metaTitle: {
    type: String,
    maxlength: 70,
  },
  metaDescription: {
    type: String,
    maxlength: 160,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-generate slug, excerpt, readTime, publishedAt
postSchema.pre('save', async function (next) {
  // Generate slug from title
  if (this.isModified('title') || !this.slug) {
    const base = slugify(this.title, { lower: true, strict: true });
    let slug = base;
    let count = 1;
    while (await mongoose.model('Post').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${count++}`;
    }
    this.slug = slug;
  }

  // Auto-generate excerpt from content
  if (!this.excerpt && this.content) {
    this.excerpt = this.content
      .replace(/<[^>]+>/g, '')
      .substring(0, 200) + '...';
  }

  // Calculate read time (avg 200 words per minute)
  if (this.content) {
    const words = this.content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(words / 200));
  }

  // Set publishedAt when first published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Virtual: like count
postSchema.virtual('likeCount', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'post',
  count: true,
});

// Virtual: comment count
postSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  count: true,
});

// Text index for search
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

export default mongoose.model('Post', postSchema);