import React, { useEffect, useState, useRef } from 'react';
import marked from 'marked';
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

//animation speed
const speed = process.env.NODE_ENV === 'development' ? 1 : 16;
const App: React.FC = () => {
  /* refs */
  const editorRef = useRef<HTMLPreElement>(null);
  const workRef = useRef<HTMLPreElement>(null);
  // code buffer
  const editorStrBuffer = useRef<string>('');
  // the style write buffer
  const styleBuffer = useRef<string>('');
  // work string buffer
  const workBuffer = useRef<string>('');
  // whether the comment is open
  const openComment = useRef<boolean>(false);
  // pause
  const isPaused = useRef<boolean>(true);
  // isEnd
  const isEnd = useRef<boolean>(true);

  /* hook state */
  const [style, setStyle] = useState<string>('');
  const [editorStr, setEditorStr] = useState<string>('');
  const [workStr, setWorkStr] = useState<string>('');
  const [isPausedView, setIsPausedView] = useState<boolean>(true);

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
   */
  function writeChar(target: TARGET, chars: string, updateView = true): void {
    // if target is style just write
    if (target === TARGET.STYLESHEET) {
      styleBuffer.current += chars;
      // we buffer the chars and render it in <style> tag only when chars matches ';'
      // which means the end of css properties
      if (chars === ';') {
        if (updateView) {
          setStyle(styleBuffer.current);
        }
      }
    }
    // if target is editor, we need to handle the chars with html tag
    else if (target === TARGET.EDITOR) {
      // if write to editor, we need write it in style also
      writeChar(TARGET.STYLESHEET, chars, updateView);
      const commentRegex = /(\/\*(?:[^](?!\/\*))*\*)$/;
      const cssPropertiesRegex = /([a-zA-Z- ^\n]*):([^:]*)$/;
      const selectorRegex = /((.|,\r|,\r\n|,\n)*)$/;
      const unitRegex = /(\d+)(px|vh|vw|em|rem|s)*/g;
      if (openComment.current && chars !== '/') {
        // Short-circuit during a comment so we don't highlight inside it.
        editorStrBuffer.current += chars;
      } else if (chars === '/' && openComment.current === false) {
        openComment.current = true;
        editorStrBuffer.current += chars;
      } else if (
        chars === '/' &&
        editorStrBuffer.current.slice(-1) === '*' &&
        openComment.current === true
      ) {
        openComment.current = false;
        // Unfortunately we can't just open a span and close it, because the browser will helpfully
        // 'fix' it for us, and we'll end up with a single-character span and an empty closing tag.
        editorStrBuffer.current = editorStrBuffer.current.replace(
          commentRegex,
          '<span class="comment">$1/</span>'
        );
      } else if (chars === ';') {
        editorStrBuffer.current = editorStrBuffer.current.replace(
          cssPropertiesRegex,
          (...$: string[]) => {
            // replace unit in css
            if ($[2]) {
              $[2] = $[2].replace(unitRegex, '$1<span class="unit">$2</span>');
            }
            return `<span class="key">${$[1]}</span>:<span class="value">${$[2]}</span>;`;
          }
        );
      } else if (chars === '{') {
        editorStrBuffer.current = editorStrBuffer.current.replace(
          selectorRegex,
          '<span class="selector">$1</span>{'
        );
      } else {
        editorStrBuffer.current += chars;
      }
      if (updateView) {
        setEditorStr(editorStrBuffer.current);
      }
    } else if (target === TARGET.WORK) {
      workBuffer.current += chars;
      if (updateView) {
        if (workBuffer.current.length >= workData.length) {
          setWorkStr(marked.parse(workBuffer.current));
        } else {
          setWorkStr(workBuffer.current);
        }
      }
    }
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
    // write until is end
    while (pos < targetData.length && !isEnd.current) {
      // Write a character or multiple characters to the buffer.
      const chars: string = targetData.slice(pos, pos + charsPerWirte);
      pos += charsPerWirte;
      writeChar(target, chars, true);
      // Ensure we stay scrolled to the bottom.
      scrollToEnd(target);
      // regex
      const endOfSentence = /[.?!]\s$/;
      const comma = /\D[,]\s$/;
      const endOfBlock = /[^/]\n\n$/;
      let thisInterval = delay;
      const thisSlice = targetData.slice(pos - 2, pos + 1);
      // test the wirte chars and wait certain times
      if (comma.test(thisSlice)) {
        thisInterval = delay * 30;
      }
      if (endOfBlock.test(thisSlice)) {
        thisInterval = delay * 50;
      }
      if (endOfSentence.test(thisSlice)) {
        thisInterval = delay * 70;
      }
      // wait if paused
      do {
        await Promise.delay(thisInterval);
        // if is end (skip) , break this
        if (isEnd.current) {
          break;
        }
      } while (isPaused.current);
    }
  }
  function handleSkip(): void {
    // clear all buffers
    styleBuffer.current = '';
    editorStrBuffer.current = '';
    workBuffer.current = '';
    // write to buffers and don't update view
    for (const i of codeData) {
      writeChar(TARGET.EDITOR, i, false);
    }
    for (const i of workData) {
      writeChar(TARGET.WORK, i, false);
    }
    for (const i of workCss) {
      writeChar(TARGET.EDITOR, i, false);
    }
    // update views
    setStyle(styleBuffer.current);
    setEditorStr(editorStrBuffer.current);
    setWorkStr(marked(workData));
    // set paused status
    setIsPausedView(true);
    // set variable
    isPaused.current = true;
    isEnd.current = true;
    styleBuffer.current = '';
    editorStrBuffer.current = '';
    workBuffer.current = '';
  }
  function handlePause(): void {
    isPaused.current = true;
    setIsPausedView(true);
  }
  async function handleStart(): Promise<void> {
    isPaused.current = false;
    setIsPausedView(false);
    // if animation is end, restart animation.
    if (isEnd.current) {
      isEnd.current = false;
      styleBuffer.current = '';
      editorStrBuffer.current = '';
      workBuffer.current = '';
      setStyle('');
      setEditorStr('');
      setWorkStr('');
      await write(TARGET.EDITOR, codeData, 0, 1, speed);
      await write(TARGET.WORK, workData, 0, 1, speed);
      await write(TARGET.EDITOR, workCss, 0, 1, speed / 2).then(() => {
        // reset variable
        styleBuffer.current = '';
        editorStrBuffer.current = '';
        workBuffer.current = '';
        isEnd.current = true;
        setIsPausedView(true);
      });
    }
  }

  // hook effect
  useEffect(() => {
    // just show resume on page loaded
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
      <Controller
        pauseStatus={isPausedView}
        onStart={handleStart}
        onSkip={handleSkip}
        onPause={handlePause}
      />
    </div>
  );
};

export default App;
