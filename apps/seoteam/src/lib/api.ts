// Thin client for the cookie-guarded /api/seo/* endpoints. Every call sends the
// session cookie (credentials: 'include'); a 401 means "not logged in" and the
// caller should bounce to the login screen.

export interface KeywordEntry {
  keyword: string;
  url: string;
  rel: 'dofollow' | 'nofollow' | 'sponsored';
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  template: string;
  body: string;
  excerpt: string | null;
  meta_title: string | null;
  cover_image: string | null;
  keywords: KeywordEntry[];
  link_first_only: boolean;
  status: 'draft' | 'published';
  author: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type PostInput = Partial<Omit<Post, 'id' | 'views' | 'created_at' | 'updated_at' | 'published_at'>>;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/seo${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || `request failed (${res.status})`);
  return data as T;
}

export const api = {
  session: () => req<{ authenticated: boolean }>('/session'),
  login: (password: string) => req<{ ok: true }>('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => req<{ ok: true }>('/logout', { method: 'POST' }),

  listPosts: (status?: string) =>
    req<{ posts: Post[] }>(`/posts${status ? `?status=${encodeURIComponent(status)}` : ''}`).then((r) => r.posts),
  getPost: (id: string) => req<{ post: Post }>(`/posts/${id}`).then((r) => r.post),
  createPost: (input: PostInput) =>
    req<{ post: Post }>('/posts', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.post),
  updatePost: (id: string, input: PostInput) =>
    req<{ post: Post }>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.post),
  deletePost: (id: string) => req<void>(`/posts/${id}`, { method: 'DELETE' }),

  uploadImage: async (file: File): Promise<string> => {
    const dataBase64 = await fileToBase64(file);
    const r = await req<{ url: string }>('/upload', {
      method: 'POST',
      body: JSON.stringify({ contentType: file.type, dataBase64 }),
    });
    return r.url;
  },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}
