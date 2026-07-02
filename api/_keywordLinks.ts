// Keyword → backlink transform for the public blog.
// -----------------------------------------------------------------------------
// Turns occurrences of each keyword in a post body into an anchor pointing at
// its target URL. Runs on a PARSED DOM (node-html-parser), not a regex over raw
// HTML, so it can walk text nodes only and skip subtrees where linking would be
// wrong or produce nested anchors: existing <a>, headings, and <code>/<pre>.
//
// Rules (per spec §4): case-insensitive, word-boundary aware, first-occurrence
// by default (link_first_only), external target with rel per keyword setting
// (always noopener; + nofollow / sponsored when chosen).

import { parse, NodeType, TextNode, type Node, type HTMLElement } from 'node-html-parser';
import { escapeHtml } from './_http';
import type { KeywordEntry } from './_supabaseAdmin';

// Never descend into these — linking here would nest anchors or corrupt code.
const SKIP_TAGS = new Set(['A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'CODE', 'PRE']);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function relFor(rel: KeywordEntry['rel']): string {
  const rels = ['noopener'];
  if (rel === 'nofollow') rels.push('nofollow');
  else if (rel === 'sponsored') rels.push('sponsored');
  return rels.join(' ');
}

// matchText is already source-form HTML text (from rawText), so it is inserted
// as-is; only the URL is attribute-escaped.
function anchorHtml(matchText: string, entry: KeywordEntry): string {
  return `<a href="${escapeHtml(entry.url)}" target="_blank" rel="${relFor(entry.rel)}">${matchText}</a>`;
}

interface State {
  done: boolean; // for link_first_only: set once the first match is linked
}

function processTextNode(
  textNode: TextNode,
  entry: KeywordEntry,
  source: string,
  firstOnly: boolean,
  state: State
): void {
  const raw = textNode.rawText;
  if (!raw) return;

  const re = new RegExp(source, 'gi');
  const segments: Array<{ type: 'text' | 'link'; text: string }> = [];
  let last = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (firstOnly && state.done) break;
    segments.push({ type: 'text', text: raw.slice(last, m.index) });
    segments.push({ type: 'link', text: m[0] });
    last = m.index + m[0].length;
    matched = true;
    state.done = true;
    if (m[0].length === 0) re.lastIndex++; // guard against zero-width loops
    if (firstOnly) break;
  }
  if (!matched) return;
  segments.push({ type: 'text', text: raw.slice(last) });

  const parent = textNode.parentNode as HTMLElement;
  const idx = parent.childNodes.indexOf(textNode);
  if (idx < 0) return;

  const newNodes: Node[] = [];
  for (const seg of segments) {
    if (seg.type === 'text') {
      if (seg.text.length === 0) continue;
      newNodes.push(new TextNode(seg.text, parent));
    } else {
      const a = parse(anchorHtml(seg.text, entry)).childNodes[0];
      a.parentNode = parent;
      newNodes.push(a);
    }
  }
  parent.childNodes.splice(idx, 1, ...newNodes);
}

function walk(
  node: Node,
  entry: KeywordEntry,
  source: string,
  firstOnly: boolean,
  state: State
): void {
  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const tag = (node as HTMLElement).rawTagName?.toUpperCase();
    if (tag && SKIP_TAGS.has(tag)) return;
    // Snapshot children: processTextNode mutates the live childNodes array.
    for (const child of [...node.childNodes]) {
      if (firstOnly && state.done) break;
      walk(child, entry, source, firstOnly, state);
    }
  } else if (node.nodeType === NodeType.TEXT_NODE) {
    processTextNode(node as TextNode, entry, source, firstOnly, state);
  }
}

// Apply all keyword backlinks to a (already-sanitized) HTML body.
export function applyKeywordLinks(
  html: string,
  keywords: KeywordEntry[],
  linkFirstOnly: boolean
): string {
  if (!html || !keywords?.length) return html;
  const root = parse(html);
  for (const entry of keywords) {
    const kw = entry?.keyword?.trim();
    if (!kw || !entry.url) continue;
    const source = `(?<![A-Za-z0-9_])${escapeRegExp(kw)}(?![A-Za-z0-9_])`;
    walk(root, entry, source, linkFirstOnly, { done: false });
  }
  return root.toString();
}
