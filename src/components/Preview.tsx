import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useBookStore } from '../hooks/useBookStore';

interface ContentChunk {
  type: 'markdown' | 'right' | 'center' | 'poem' | 'poem2' | 'title';
  content: string;
}

const parseContentToChunks = (content: string): ContentChunk[] => {
  const chunks: ContentChunk[] = [];
  const lines = content.split('\n');
  let currentChunk: { type: 'markdown' | 'poem' | 'poem2'; lines: string[] } = { type: 'markdown', lines: [] };
  let inPoem = false;
  let inPoem2 = false;

  for (const line of lines) {
    if (inPoem2) {
      if (line.trim() === '++') {
        inPoem2 = false;
        if (currentChunk.lines.length > 0) {
          chunks.push({ type: 'poem2', content: currentChunk.lines.join('\n') });
        }
        currentChunk = { type: 'markdown', lines: [] };
      } else {
        currentChunk.lines.push(line);
      }
      continue;
    }

    if (inPoem) {
      if (line.trim() === '~~') {
        inPoem = false;
        if (currentChunk.lines.length > 0) {
          chunks.push({ type: 'poem', content: currentChunk.lines.join('\n') });
        }
        currentChunk = { type: 'markdown', lines: [] };
      } else {
        currentChunk.lines.push(line);
      }
      continue;
    }

    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# ')) {
       if (currentChunk.lines.length > 0) {
        chunks.push({ type: 'markdown', content: currentChunk.lines.join('\n') });
      }
      chunks.push({ type: 'title', content: trimmedLine.replace('# ', '') });
      currentChunk = { type: 'markdown', lines: [] };
    } else if (trimmedLine.startsWith('-r')) {
      if (currentChunk.lines.length > 0) {
        chunks.push({ type: 'markdown', content: currentChunk.lines.join('\n') });
      }
      chunks.push({ type: 'right', content: line.substring(line.indexOf('-r') + 2) });
      currentChunk = { type: 'markdown', lines: [] };
    } else if (trimmedLine.startsWith('-c')) {
      if (currentChunk.lines.length > 0) {
        chunks.push({ type: 'markdown', content: currentChunk.lines.join('\n') });
      }
      chunks.push({ type: 'center', content: line.substring(line.indexOf('-c') + 2) });
      currentChunk = { type: 'markdown', lines: [] };
    } else if (trimmedLine === '~') {
      if (currentChunk.lines.length > 0) {
        chunks.push({ type: 'markdown', content: currentChunk.lines.join('\n') });
      }
      inPoem = true;
      currentChunk = { type: 'poem', lines: [] };
    } else if (trimmedLine === '+') {
      if (currentChunk.lines.length > 0) {
        chunks.push({ type: 'markdown', content: currentChunk.lines.join('\n') });
      }
      inPoem2 = true;
      currentChunk = { type: 'poem2', lines: [] };
    } else {
      currentChunk.lines.push(line);
    }
  }

  if (currentChunk.lines.length > 0) {
    chunks.push({ type: currentChunk.type, content: currentChunk.lines.join('\n') });
  }

  return chunks;
};

const Preview: React.FC = () => {
  const { title, author, publisher, contributors, coverImage, chapters, colors, paragraphIndent, chapterAlignment, ebookUrl, license } = useBookStore();

  return (
    <div className="flex-1 bg-gray-200 p-8 overflow-y-auto">
      <div id="preview-content" className="shadow-lg">
        {coverImage && (
          <div className="preview-page bg-white">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="preview-page bg-white flex flex-col justify-center items-center text-center p-16">
          <h1 className="font-serif text-5xl mb-4" style={{ color: colors.bookTitle }}>{title}</h1>
          <p className="font-serif text-2xl text-gray-700">{author}</p>
          {publisher && <p className="text-gray-500 mt-8">{publisher}</p>}
          {ebookUrl && <p className="text-gray-500 mt-2">{ebookUrl}</p>}
          {contributors.length > 0 && (
            <div className="mt-8">
              {contributors.map((contributor, index) => (
                <p key={index} className="text-gray-500">
                  {contributor}
                </p>
              ))}
            </div>
          )}
          <p className="text-gray-500 mt-4">{license}</p>
        </div>
        <div className="continuous-content bg-white text-black font-serif p-8">
          {chapters.map((chapter) => {
            const contentWithTitle = `# ${chapter.title}\n${chapter.content.replace(/^# .*\n?/, '')}`;
            const chunks = parseContentToChunks(contentWithTitle);
            
            return (
              <div key={chapter.id} className="chapter-section mb-12">
                {chunks.map((chunk, chunkIndex) => {
                  const key = `${chapter.id}-${chunkIndex}`;
                  switch (chunk.type) {
                    case 'title':
                      return <h1 key={key} className={`text-4xl font-bold mb-8 font-serif text-${chapterAlignment}`} style={{ color: colors.chapterTitle }}>{chunk.content}</h1>;
                    case 'right':
                      return <p key={key} className="text-right my-4" style={{ color: colors.paragraph }}>{chunk.content}</p>;
                    case 'center':
                      return <p key={key} className="text-center my-4" style={{ color: colors.paragraph }}>{chunk.content}</p>;
                    case 'poem':
                      return (
                        <div key={key} className="poem my-4">
                          {chunk.content.split('\n').map((line, i) => (
                            <p key={i} className="m-0" style={{ color: colors.paragraph, textIndent: i % 2 === 1 ? '2em' : '0' }}>{line}</p>
                          ))}
                        </div>
                      );
                    case 'poem2':
                      return (
                        <div key={key} className="poem2 my-4">
                          {chunk.content.split('\n').map((line, i) => (
                            <p key={i} className="m-0 ml-8" style={{ color: colors.paragraph }}>{line}</p>
                          ))}
                        </div>
                      );
                    case 'markdown':
                      return (
                        <ReactMarkdown
                          key={key}
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({node, ...props}) => <h2 className={`text-3xl font-bold mt-6 mb-4 font-serif text-${chapterAlignment}`} style={{ color: colors.chapterTitle }} {...props} />,
                            h3: ({node, ...props}) => <h3 className={`text-2xl font-bold mt-4 mb-3 font-serif text-${chapterAlignment}`} style={{ color: colors.chapterTitle }} {...props} />,
                            p: ({node, ...props}) => <p className="my-4 leading-relaxed text-justify" style={{ color: colors.paragraph, textIndent: paragraphIndent ? '2em' : '0' }} {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside my-4" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside my-4" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />,
                            img: ({node, ...props}) => <img className="max-w-full h-auto my-4" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                            code: ({node, inline, ...props}) => 
                              inline ? 
                                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} /> : 
                                <pre className="bg-gray-100 p-4 rounded my-4 overflow-x-auto"><code {...props} /></pre>,
                          }}
                        >
                          {chunk.content}
                        </ReactMarkdown>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .preview-page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto 2rem auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          page-break-before: always;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .continuous-content {
          width: 210mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          min-height: 500px;
        }
      `}</style>
    </div>
  );
};

export default Preview;
