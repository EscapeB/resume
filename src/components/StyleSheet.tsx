import React, { FunctionComponent, PropsWithChildren } from 'react';
import ReactDom from 'react-dom';
export interface StyleSheetProps {
  style?: string;
}
const StyleSheet: FunctionComponent<StyleSheetProps> = (
  props: PropsWithChildren<StyleSheetProps>
) => {
  // console.log(props.style);
  return ReactDom.createPortal(<style>{props.style}</style>, document.head);
};
export default StyleSheet;
