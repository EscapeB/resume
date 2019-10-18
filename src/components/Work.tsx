import React, { forwardRef, Ref } from 'react';
// import '../resource/work.scss';

export interface WorkProps {
  mdStr?: string;
}
const WorkCore = (props: WorkProps = { mdStr: '' }, ref: Ref<HTMLPreElement>): JSX.Element => {
  return <pre ref={ref} className="work" dangerouslySetInnerHTML={{ __html: props.mdStr + '' }} />;
};
const Work = forwardRef<HTMLPreElement, WorkProps>(WorkCore);

export default Work;
