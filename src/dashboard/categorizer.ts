import type { ITopicCategorizer } from '../shared/types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'to', 'for', 'with', 'and', 'of', 'in', 'on',
  'it', 'you', 'me', 'my', 'we', 'how', 'what', 'why', 'can', 'do', 'does',
  'will', 'here', 'this', 'that', 'are', 'be', 'was', 'not', 'or', 'but',
  'from', 'at', 'by', 'as', 'your', 'i', 'its', 'has',
]);

interface CategoryDef {
  name: string;
  keywords: string[];
}

const CATEGORIES: CategoryDef[] = [
  { name: 'Frontend', keywords: ['react', 'vue', 'angular', 'svelte', 'css', 'html', 'component', 'ui', 'dom', 'layout', 'style', 'tailwind', 'scss', 'less', 'webpack', 'vite', 'nextjs', 'gatsby', 'htmx', 'jquery', 'bootstrap', 'responsive', 'frontend', 'javascript', 'typescript', 'jsx', 'tsx', 'preact', 'nuxt', 'sass', 'render', 'debug', 'bug', 'fix', 'hook', 'hooks', 'lifecycle', 'refactor', 'design', 'website', 'nav', 'menu', 'sidebar', 'modal', 'form', 'flexbox', 'animation'] },
  { name: 'Backend', keywords: ['api', 'server', 'database', 'sql', 'endpoint', 'rest', 'graphql', 'auth', 'node', 'express', 'django', 'flask', 'fastapi', 'rails', 'laravel', 'spring', 'golang', 'rust', 'prisma', 'orm', 'middleware', 'microservice', 'postgresql', 'mongo', 'redis', 'backend', 'python', 'java', 'csharp', 'dotnet', 'php', 'debug', 'bug', 'fix', 'refactor', 'error', 'script', 'tool', 'cli', 'code', 'function', 'package', 'schema', 'migration', 'queue', 'cache'] },
  { name: 'DevOps', keywords: ['ci', 'cd', 'pipeline', 'deploy', 'kubernetes', 'k8s', 'docker', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'nginx', 'apache', 'monitoring', 'logging', 'alert', 'scaling', 'devops', 'jenkins', 'github', 'action'] },
  { name: 'Data & Analytics', keywords: ['pandas', 'sql', 'query', 'analyze', 'data', 'csv', 'json', 'excel', 'tableau', 'visualization', 'etl', 'spark', 'hadoop', 'statistics', 'regex', 'schema', 'analysis', 'analytics', 'debug', 'bug', 'fix'] },
  { name: 'AI / Machine Learning', keywords: ['neural', 'ml', 'llm', 'gpt', 'transformer', 'model', 'train', 'inference', 'tensorflow', 'pytorch', 'prompt', 'embedding', 'vector', 'agent', 'rag', 'fine-tune', 'ai', 'machine', 'learning', 'deep', 'chatgpt', 'claude', 'gemini', 'openai'] },
  { name: 'Mobile Dev', keywords: ['ios', 'android', 'swift', 'kotlin', 'flutter', 'react', 'native', 'expo', 'app', 'play', 'store', 'widget', 'mobile'] },
  { name: 'Security', keywords: ['security', 'auth', 'encrypt', 'decrypt', 'hash', 'jwt', 'oauth', 'ssl', 'tls', 'xss', 'csrf', 'vulnerability', 'exploit', 'pen', 'test', 'hack'] },
  { name: 'Testing', keywords: ['test', 'unit', 'e2e', 'jest', 'vitest', 'cypress', 'playwright', 'mock', 'stub', 'coverage', 'assert', 'testing', 'debug', 'bug', 'fix'] },
  { name: 'Game Dev', keywords: ['game', 'unity', 'unreal', 'godot', '3d', 'shader', 'physics', 'sprite', 'fps', 'rpg', 'level', 'animation', 'gamedev'] },
  { name: 'Writing & Editing', keywords: ['write', 'draft', 'essay', 'blog', 'article', 'content', 'summary', 'proofread', 'grammar', 'edit', 'rewrite', 'paraphrase', 'polish', 'tone', 'email', 'letter', 'resume', 'cv', 'story', 'feedback', 'suggestion', 'idea', 'cover'] },
  { name: 'Research', keywords: ['research', 'study', 'paper', 'citation', 'academic', 'literature', 'survey', 'methodology', 'hypothesis', 'experiment', 'scientific'] },
  { name: 'Business & Strategy', keywords: ['business', 'strategy', 'roadmap', 'pitch', 'deck', 'revenue', 'kpi', 'okr', 'stakeholder', 'market', 'competitor', 'startup', 'saas', 'product', 'management', 'resume', 'cv', 'interview', 'job', 'career', 'plan', 'meeting', 'agenda', 'schedule', 'team'] },
  { name: 'Legal', keywords: ['legal', 'contract', 'terms', 'compliance', 'gdpr', 'privacy', 'policy', 'clause', 'liability', 'copyright', 'patent', 'law'] },
  { name: 'Finance', keywords: ['finance', 'budget', 'invest', 'stock', 'crypto', 'bitcoin', 'tax', 'account', 'invoice', 'payroll', 'forex', 'trading', 'money'] },
  { name: 'Marketing', keywords: ['marketing', 'seo', 'ad', 'campaign', 'social', 'media', 'copywrite', 'brand', 'funnel', 'conversion', 'newsletter', 'sales'] },
  { name: 'Education', keywords: ['learn', 'tutorial', 'course', 'homework', 'exam', 'study', 'explain', 'teach', 'textbook', 'lecture', 'quiz', 'curriculum', 'education', 'student', 'teacher', 'tips', 'guide', 'practice', 'example', 'understanding', 'introduction', 'basics'] },
  { name: 'Health & Fitness', keywords: ['health', 'fitness', 'workout', 'diet', 'nutrition', 'meal', 'supplement', 'running', 'gym', 'yoga', 'meditation', 'sleep', 'calorie', 'exercise'] },
  { name: 'Cooking & Food', keywords: ['cook', 'recipe', 'bake', 'ingredient', 'meal', 'dinner', 'lunch', 'dessert', 'cuisine', 'restaurant', 'food', 'pasta', 'soup', 'salad', 'bread', 'chicken', 'vegetarian', 'vegan'] },
  { name: 'Travel', keywords: ['travel', 'trip', 'flight', 'hotel', 'itinerary', 'destination', 'visa', 'passport', 'booking', 'tourism', 'backpack', 'vacation', 'airbnb'] },
  { name: 'Movies & TV', keywords: ['movie', 'film', 'series', 'episode', 'netflix', 'director', 'actor', 'cinema', 'review', 'trailer', 'anime', 'documentary', 'hbo', 'disney'] },
  { name: 'Music', keywords: ['music', 'song', 'album', 'guitar', 'piano', 'chord', 'melody', 'beat', 'genre', 'artist', 'band', 'lyric', 'playlist', 'spotify'] },
  { name: 'Sports', keywords: ['sport', 'football', 'soccer', 'basketball', 'nba', 'nfl', 'premier', 'league', 'tournament', 'match', 'player', 'coach', 'cricket', 'tennis', 'baseball', 'hockey'] },
  { name: 'Pets & Animals', keywords: ['pet', 'dog', 'cat', 'bird', 'fish', 'breed', 'vet', 'animal', 'wildlife', 'horse', 'aquarium', 'puppy', 'kitten'] },
  { name: 'Relationships & Advice', keywords: ['relationship', 'advice', 'breakup', 'date', 'friend', 'family', 'colleague', 'boss', 'conflict', 'boundary', 'therapy', 'social', 'girlfriend', 'boyfriend'] },
  { name: 'Philosophy & Reflection', keywords: ['philosophy', 'meaning', 'ethics', 'purpose', 'deep', 'reflect', 'journal', 'existential', 'stoic', 'moral', 'consciousness', 'socrates', 'nietzsche'] },
  { name: 'Hobbies & DIY', keywords: ['hobby', 'diy', 'craft', 'woodwork', 'garden', 'paint', 'draw', 'knit', 'sew', 'lego', 'build', 'repair', 'arduino', 'carpentry', 'pottery'] },
];

function stem(word: string): string {
  for (const suffix of ['ing', 'ed', 's', 'ly', 'tion', 'ment', 'er', 'est', 'ness']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

export class TopicCategorizer implements ITopicCategorizer {
  categorize(title: string): string {
    if (!title || !title.trim()) return 'Miscellaneous';

    const raw = title
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !STOPWORDS.has(w));

    const allWords = new Set<string>();
    for (const w of raw) {
      allWords.add(w);
      allWords.add(stem(w));
    }

    let bestCategory = 'Miscellaneous';
    let bestScore = 0;

    for (const category of CATEGORIES) {
      let score = 0;
      for (const kw of category.keywords) {
        if (allWords.has(kw)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category.name;
      }
    }

    return bestCategory;
  }
}
