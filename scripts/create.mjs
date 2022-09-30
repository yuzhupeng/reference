import markdown from '@wcj/markdown-to-html';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import remarkGemoji from 'remark-gemoji'
import { htmlTagAddAttri } from './nodes/htmlTagAddAttri.mjs';
import { footer } from './nodes/footer.mjs';
import { header } from './nodes/header.mjs';
import { rehypeUrls } from './utils/rehypeUrls.mjs';
import { tooltips } from './utils/tooltips.mjs';
import { homeCardIcons } from './utils/homeCardIcons.mjs';
import { panelAddNumber } from './utils/panelAddNumber.mjs';
import { getChilds, getHeader } from './utils/childs.mjs';

const favicon = `data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20height%3D%221em%22%20width%3D%221em%22%3E%20%3Cpath%20opacity%3D%22.4%22%20d%3D%22m21.66%2010.44-.98%204.18c-.84%203.61-2.5%205.07-5.62%204.77-.5-.04-1.04-.13-1.62-.27l-1.68-.4c-4.17-.99-5.46-3.05-4.48-7.23l.98-4.19c.2-.85.44-1.59.74-2.2%201.17-2.42%203.16-3.07%206.5-2.28l1.67.39c4.19.98%205.47%203.05%204.49%207.23Z%22%20fill%3D%22%23777%22%2F%3E%20%3Cpath%20d%3D%22M15.06%2019.39c-.62.42-1.4.77-2.35%201.08l-1.58.52c-3.97%201.28-6.06.21-7.35-3.76L2.5%2013.28c-1.28-3.97-.22-6.07%203.75-7.35l1.58-.52c.41-.13.8-.24%201.17-.31-.3.61-.54%201.35-.74%202.2l-.98%204.19c-.98%204.18.31%206.24%204.48%207.23l1.68.4c.58.14%201.12.23%201.62.27Zm2.43-8.88c-.06%200-.12-.01-.19-.02l-4.85-1.23a.75.75%200%200%201%20.37-1.45l4.85%201.23a.748.748%200%200%201-.18%201.47Z%22%20fill%3D%22%23999%22%20%2F%3E%20%3Cpath%20d%3D%22M14.56%2013.89c-.06%200-.12-.01-.19-.02l-2.91-.74a.75.75%200%200%201%20.37-1.45l2.91.74c.4.1.64.51.54.91-.08.34-.38.56-.72.56Z%22%20fill%3D%22%23999%22%20%2F%3E%20%3C%2Fsvg%3E`;

/** Markdown 文档转成树形结构 */
export function getTocsTree(arr = [], result = []) {
  const data = panelAddNumber(arr);
  
  let n = 0;
  let level = -1;

  while (n < data.length) {
    const toc = data[n];

    if (level === -1) {
      level = toc.number;
    }
    const titleNum = Number(toc.tagName?.replace(/^h/, ''));

    if (toc.number === level && titleNum === level) {
      const header = getHeader(data.slice(n), level);
      const wrapCls = ['wrap'];
      const headerCls = ['wrap-header', `h${level}wrap`];

      if (level === 1) wrapCls.push('max-container');
      const wrapStyle = toc.properties['wrap-style'];
      delete toc.properties['wrap-style']
      const wrapClass = toc.properties['wrap-class'];
      if (wrapClass) wrapCls.push(wrapClass);
      delete toc.properties['wrap-class'];
      const panle = {
        type: 'element',
        tagName: 'div',
        properties: { class: wrapCls, style: wrapStyle },
        children: [
          {
            type: 'element',
            tagName: level === 1 ? 'header' : 'div',
            properties: { class: headerCls },
            children: [
              toc,
              {
                type: 'element',
                tagName: 'div',
                properties: { class: 'wrap-body' },
                children: [
                  ...header
                ],
              }
            ],
          }
        ],
      }
      const childs = getChilds([...data.slice(n + 1)], level);
      const resultChilds = getTocsTree(childs);
      if (resultChilds.length > 0) {
        const bodyStyle = toc.properties['body-style'];
        delete toc.properties['body-style']
        const bodyClass = toc.properties['body-class'];
        delete toc.properties['body-class']
        panle.children = panle.children.concat({
          type: 'element',
          tagName: 'div',
          properties: { class: [`h${level}wrap-body`, bodyClass], style: bodyStyle },
          children: [...resultChilds]
        });
      }
      result.push(panle);
    }

    n++;
  }
  return result;
}

export function create(str = '', options = {}) {
  let title = str.match(/[^===]+(?=[===])/g) || [];
  let description = str.match(/\n==={1,}\n+([\s\S]*?)\n/g) || [];
  title = title[0] || '';
  description = (description[0] || '').replace(/^\n[=\n]+/, '').replace(/\[([\s\S]*?)?\]\(([\s\S]*?)?\)/g, '$1').replace(/\n/, '');
  const subTitle = options.filename && !options.isHome ? `${options.filename} cheatsheet & `: ''
  const mdOptions = {
    hastNode: false,
    remarkPlugins: [remarkGemoji],
    rehypePlugins: [
      rehypeFormat,
      [rehypeDocument, {
        title: `${title ? `${title} & ` : ''} ${subTitle} Quick Reference`,
        css: [ ...options.css ],
        link: [
          {rel: 'icon', href: favicon, type: 'image/svg+xml'}
        ],
        meta: [
          { description: `${description}为开发人员分享快速参考备忘单。` },
          { keywords: `Quick,Reference,cheatsheet,${!options.isHome && options.filename || ''}` }
        ]
      }],
    ],
    rewrite: (node, index, parent) => {
      homeCardIcons(node, parent, options.isHome);
      tooltips(node, index, parent);
      htmlTagAddAttri(node, options);
      rehypeUrls(node);
      if (node.type === 'element' && node.tagName === 'body') {
        node.children = getTocsTree([ ...node.children ]);
        node.children.unshift(header(options));
        node.children.push(footer());
      }
    }
  }
  

  return markdown(str, mdOptions);
}