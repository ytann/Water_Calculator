import { describe, it, expect } from 'vitest';
import { TopicCategorizer } from '../../src/dashboard/categorizer';

describe('TopicCategorizer', () => {
  const categorizer = new TopicCategorizer();

  it('categorizes a frontend title', () => {
    expect(categorizer.categorize('Fixing React component re-renders')).toBe('Frontend');
  });

  it('categorizes a backend title', () => {
    expect(categorizer.categorize('Building a REST API with Express and PostgreSQL')).toBe('Backend');
  });

  it('categorizes a devops title', () => {
    expect(categorizer.categorize('Setting up Docker and Kubernetes CI/CD pipeline')).toBe('DevOps');
  });

  it('categorizes a data title', () => {
    expect(categorizer.categorize('Analyzing CSV data with pandas and SQL')).toBe('Data & Analytics');
  });

  it('categorizes a writing title', () => {
    expect(categorizer.categorize('Proofreading and editing my blog draft')).toBe('Writing & Editing');
  });

  it('categorizes a cooking title', () => {
    expect(categorizer.categorize('Best pasta recipe with homemade sauce')).toBe('Cooking & Food');
  });

  it('categorizes a sports title', () => {
    expect(categorizer.categorize('NBA playoff predictions and player stats')).toBe('Sports');
  });

  it('categorizes a movies title', () => {
    expect(categorizer.categorize('Reviewing the latest Netflix documentary series')).toBe('Movies & TV');
  });

  it('returns Miscellaneous for empty title', () => {
    expect(categorizer.categorize('')).toBe('Miscellaneous');
  });

  it('returns Miscellaneous for title with no keyword matches', () => {
    expect(categorizer.categorize('just thinking about random stuff today')).toBe('Miscellaneous');
  });

  it('handles title with mixed case and punctuation', () => {
    expect(categorizer.categorize('React vs Vue: Which is better???')).toBe('Frontend');
  });

  it('handles title with camelCase keywords', () => {
    expect(categorizer.categorize('nextjs: ServerSideRendering with prisma')).toBe('Frontend');
  });

  it('handles stemmed words (explaining → explain)', () => {
    expect(categorizer.categorize('Explaining things simply')).toBe('Education');
  });

  it('picks first category on tie', () => {
    expect(categorizer.categorize('Using React with Python')).toBe('Frontend');
  });
});
