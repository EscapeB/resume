import React, { forwardRef, Ref } from 'react';

export interface EditorProps {
  code: string;
}
const EditorCore = (props: EditorProps = { code: '' }, ref: Ref<HTMLPreElement>): JSX.Element => {
  return <pre ref={ref} className="editor" dangerouslySetInnerHTML={{ __html: props.code }} />;
};
const Editor = forwardRef<HTMLPreElement, EditorProps>(EditorCore);
export default Editor;
