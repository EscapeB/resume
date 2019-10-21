import React, { FunctionComponent, PropsWithChildren } from 'react';
export interface ControllerProps {
  onSkip: () => void;
  onPause: () => void;
  onStart: () => void;
  pauseStatus: boolean;
}
const Controller: FunctionComponent<ControllerProps> = (
  props: PropsWithChildren<ControllerProps>
) => {
  return (
    <div className="controller">
      {props.pauseStatus ? (
        <i className="iconfont" onClick={props.onStart ? props.onStart : undefined}>
          &#xe614;
        </i>
      ) : (
        <i className="iconfont" onClick={props.onPause ? props.onPause : undefined}>
          &#xe668;
        </i>
      )}

      <i className="iconfont" onClick={props.onSkip ? props.onSkip : undefined}>
        &#xe60e;
      </i>

      {/* <button onClick={props.}></button> */}
    </div>
  );
};
export default Controller;
