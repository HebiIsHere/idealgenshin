import React from 'react';
import { FixedSizeList } from 'react-window';

const ITEM_SIZE = 48;
const LISTBOX_PADDING = 8;

function renderRow({ data, index, style }: { data: React.ReactElement[]; index: number; style: React.CSSProperties }) {
  return React.cloneElement(data[index], {
    style: { ...style, top: (style.top as number) + LISTBOX_PADDING },
  });
}

const OuterElementContext = React.createContext<Record<string, unknown>>({});

const OuterElementType = React.forwardRef<HTMLDivElement>(
  function OuterElementType(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
    const outerProps = React.useContext(OuterElementContext);
    return <div ref={ref} {...props} {...outerProps} />;
  },
);

/** Virtualized listbox for MUI Autocomplete — renders only visible items. */
export function VirtualListbox(
  props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode },
): React.ReactElement {
  const { children, ...other } = props;
  const items = React.Children.toArray(children) as React.ReactElement[];
  const itemCount = items.length;
  const height = Math.min(8, itemCount) * ITEM_SIZE + 2 * LISTBOX_PADDING;

  return (
    <div {...other}>
      <OuterElementContext.Provider value={other}>
        <FixedSizeList
          itemData={items}
          height={height}
          width="100%"
          itemSize={ITEM_SIZE}
          itemCount={itemCount}
          outerElementType={OuterElementType}
        >
          {renderRow}
        </FixedSizeList>
      </OuterElementContext.Provider>
    </div>
  );
}

export default VirtualListbox;
