import React, { useEffect, useState, useRef } from 'react';
import marked from 'marked';
import _ from 'lodash';
import Promise from 'bluebird';
import StyleSheet from './components/StyleSheet';
import Editor from './components/Editor';
import Controller from './components/Controller';
import Work from './components/Work';
import codeData from './resource/editor.raw.css';
import workData from './resource/work.raw.md';
import workCss from './resource/work.raw.css';
import './App.scss';
enum TARGET {
  EDITOR,
  WORK,
  STYLESHEET,
}
// code buffer
let editorStrBuffer = '';

// the style write buffer
let styleBuffer = '';

// work string buffer
let workBuffer = '';

// whether the comment is open
let openComment = false;

// skip
let isSkiped = false;

// pause
let isPasued = false;

// speed
const speed = process.env.NODE_ENV === 'development' ? 1 : 16;
const App: React.FC = () => {
  // refs
  const editorRef = useRef<HTMLPreElement>(null);
  const workRef = useRef<HTMLPreElement>(null);

  // hook state
  const [style, setStyle] = useState<string>('');
  const [editorStr, setEditorStr] = useState<string>('');
  const [workStr, setWorkStr] = useState<string>('');

  // hook functions
  /**
   *
   * @param target target element to scroll
   */
  function scrollToEnd(target: TARGET): void {
    if (target === TARGET.EDITOR && editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight;
    } else if (target === TARGET.WORK && workRef.current) {
      workRef.current.scrollTop = workRef.current.scrollHeight;
    }
  }
  /**
   *
   * @param target element to write
   * @param chars chars to write
   * @param updateView wheather upate view
   * @param pos position of this write
   */
  function writeChar(
    target: TARGET,
    chars: string,
    updateView = true,
    pos: number | undefined = 0
  ): string {
    // if target is style just write
    if (target === TARGET.STYLESHEET) {
      styleBuffer += chars;
      // we buffer the chars and render it in <style> tag only when chars matches ';'
      // which means the end of css properties
      if (chars === ';') {
        if (updateView) {
          setStyle(styleBuffer);
        }
      }
      return styleBuffer;
    }
    // if target is editor, we need to handle the chars with html tag
    else if (target === TARGET.EDITOR) {
      // if write to editor, we need write it in style also
      writeChar(TARGET.STYLESHEET, chars);
      const commentRegex = /(\/\*(?:[^](?!\/\*))*\*)$/;
      const cssPropertiesRegex = /([a-zA-Z- ^\n]*):([^:]*)$/;
      const selectorRegex = /((.|,[\n|\r\n|\r])*)$/;
      const unitRegex = /(\d+)(px|vh|vw|em|rem|s)*/g;
      if (openComment && chars !== '/') {
        // Short-circuit during a comment so we don't highlight inside it.
        editorStrBuffer += chars;
      } else if (chars === '/' && openComment === false) {
        openComment = true;
        editorStrBuffer += chars;
      } else if (chars === '/' && editorStrBuffer.slice(-1) === '*' && openComment === true) {
        openComment = false;
        // Unfortunately we can't just open a span and close it, because the browser will helpfully
        // 'fix' it for us, and we'll end up with a single-character span and an empty closing tag.
        editorStrBuffer = editorStrBuffer.replace(commentRegex, '<span class="comment">$1/</span>');
      } else if (chars === ';') {
        editorStrBuffer = editorStrBuffer.replace(cssPropertiesRegex, (...$: string[]) => {
          // replace unit in css
          if ($[2]) {
            $[2] = $[2].replace(unitRegex, '$1<span class="unit">$2</span>');
          }
          console.log($[2]);
          return `<span class="key">${$[1]}</span>:<span class="value">${$[2]}</span>;`;
        });

        // editorStrBuffer = editorStrBuffer.replace(valueRegex, '<span class="value">$1</span>;');
      } else if (chars === '{') {
        editorStrBuffer = editorStrBuffer.replace(
          selectorRegex,
          '<span class="selector">$1</span>{'
        );
      } else {
        editorStrBuffer += chars;
      }
      if (updateView) {
        setEditorStr(editorStrBuffer);
      }
      return editorStrBuffer;
    } else if (target === TARGET.WORK) {
      workBuffer += chars;
      if (updateView) {
        if (pos === workData.length) {
          setWorkStr(marked.parse(workBuffer));
        } else {
          setWorkStr(workBuffer);
        }
      }
    }
    return '';
  }

  /**
   *
   * @param target which element to write
   * @param targetData data to wirte
   * @param pos position of the data string
   * @param charsPerWirte numbers of char to each wirte
   * @param delay deleay of each two write
   */
  async function write(
    target: TARGET,
    targetData: string,
    pos: number,
    charsPerWirte: number,
    delay: number
  ): Promise<void> {
    // if skiped animation, just return to end the recursive
    if (isSkiped) {
      return;
    }
    // Write a character or multiple characters to the buffer.
    const chars: string = targetData.slice(pos, pos + charsPerWirte);

    pos += charsPerWirte;
    // Ensure we stay scrolled to the bottom.
    scrollToEnd(target);

    writeChar(target, chars, true, pos);

    // Schedule another write.
    const endOfSentence = /[.?!]\s$/;
    const comma = /\D[,]\s$/;
    const endOfBlock = /[^/]\n\n$/;
    if (pos < targetData.length) {
      let thisInterval = delay;
      const thisSlice = targetData.slice(pos - 2, pos + 1);
      if (comma.test(thisSlice)) {
        thisInterval = delay * 30;
      }
      if (endOfBlock.test(thisSlice)) {
        thisInterval = delay * 50;
      }
      if (endOfSentence.test(thisSlice)) {
        thisInterval = delay * 70;
      }

      do {
        await Promise.delay(thisInterval);
      } while (isPasued);

      return write(target, targetData, pos, charsPerWirte, delay);
    }
  }
  function handleSkip(): void {
    isSkiped = !isSkiped;
    // clear all buffers
    styleBuffer = '';
    editorStrBuffer = '';
    workBuffer = '';
    for (const i of codeData) {
      writeChar(TARGET.EDITOR, i, false);
    }
    for (const i of workData) {
      writeChar(TARGET.WORK, i, false);
    }
    for (const i of workCss) {
      writeChar(TARGET.EDITOR, i, false);
    }
    setEditorStr(editorStrBuffer);
    setWorkStr(marked(workData));
  }
  function handlePause(): void {
    isPasued = !isPasued;
  }
  async function handleStart(): Promise<void> {
    workBuffer = '';
    styleBuffer = '';
    isSkiped = false;
    isPasued = false;
    await write(TARGET.EDITOR, codeData, 0, 1, speed);
    await write(TARGET.WORK, workData, 0, 1, speed);
    await write(TARGET.EDITOR, workCss, 0, 1, speed / 2);
  }

  // hook effect
  useEffect(() => {
    async function asyncHelper(): Promise<void> {
      handleSkip();
    }
    asyncHelper();
  }, []);

  return (
    <div className="App">
      <StyleSheet style={style} />
      <Editor ref={editorRef} code={editorStr} />
      <Work ref={workRef} mdStr={workStr} />
      <Controller onStart={handleStart} onSkip={handleSkip} onPause={handlePause} />
    </div>
  );
};

export default App;
