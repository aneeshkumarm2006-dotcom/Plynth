// SEO post templates. Each pre-fills a sensible heading structure + inline
// guidance (placeholder text the writer replaces). `value` matches the DB
// `template` CHECK constraint in migration 0018.

export interface Template {
  value: string;
  label: string;
  description: string;
  body: string;
}

export const TEMPLATES: Template[] = [
  {
    value: 'how-to',
    label: 'How-To / Tutorial',
    description: 'Step-by-step guide answering a "how do I…" query.',
    body: `<h2>What you'll need</h2><p>List the prerequisites or tools.</p>
<h2>Step 1: …</h2><p>Explain the first action clearly.</p>
<h2>Step 2: …</h2><p>Continue the sequence.</p>
<h2>Common mistakes</h2><p>Warn readers about pitfalls.</p>
<h2>Summary</h2><p>Recap the outcome and a next step.</p>`,
  },
  {
    value: 'listicle',
    label: 'Listicle (Top N…)',
    description: 'Ranked or grouped list — great for "best/top" searches.',
    body: `<p>Intro: what this list covers and who it's for.</p>
<h2>1. First item</h2><p>Why it earns a place.</p>
<h2>2. Second item</h2><p>Key detail.</p>
<h2>3. Third item</h2><p>Key detail.</p>
<h2>How we chose</h2><p>Explain your criteria to build trust.</p>`,
  },
  {
    value: 'comparison',
    label: 'Comparison / "X vs Y"',
    description: 'Head-to-head comparison for decision-stage readers.',
    body: `<p>Intro: the two options and the reader's decision.</p>
<h2>Overview of X</h2><p>Strengths and ideal use.</p>
<h2>Overview of Y</h2><p>Strengths and ideal use.</p>
<h2>Side-by-side</h2><p>Compare price, features, support.</p>
<h2>Which should you choose?</h2><p>Give a clear recommendation by scenario.</p>`,
  },
  {
    value: 'review',
    label: 'Product / Service Review',
    description: 'In-depth evaluation with a verdict.',
    body: `<p>Intro: what you reviewed and the headline verdict.</p>
<h2>What it is</h2><p>Describe the product/service.</p>
<h2>What we liked</h2><p>Concrete pros.</p>
<h2>What could be better</h2><p>Honest cons.</p>
<h2>Verdict</h2><p>Who it's for and a rating.</p>`,
  },
  {
    value: 'news',
    label: 'News / Update',
    description: 'Timely announcement or industry update.',
    body: `<p>Lead: the who / what / when in one paragraph.</p>
<h2>What happened</h2><p>The details.</p>
<h2>Why it matters</h2><p>Impact for your readers.</p>
<h2>What's next</h2><p>Expected developments.</p>`,
  },
  {
    value: 'generic',
    label: 'Generic Article',
    description: 'A flexible starting point for any topic.',
    body: `<h2>Introduction</h2><p>Set up the topic and the reader's question.</p>
<h2>Main point</h2><p>Develop your argument or explanation.</p>
<h2>Supporting detail</h2><p>Evidence, examples, data.</p>
<h2>Conclusion</h2><p>Wrap up with a takeaway.</p>`,
  },
];

export function templateByValue(value: string): Template | undefined {
  return TEMPLATES.find((t) => t.value === value);
}
