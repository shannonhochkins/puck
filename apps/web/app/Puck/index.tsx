import { Fragment, useEffect, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import DroppableStrictMode from "../../lib/droppable-strict-mode";
import { DraggableComponent } from "../DraggableComponent";
import type { Config, Data, Field } from "../../types/Config";
import { InputOrGroup } from "../InputOrGroup";
import { ComponentList } from "../ComponentList";
import { OutlineList } from "../OutlineList";

const reorder = (list: any[], startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const replace = (list: any[], index, newItem) => {
  const result = Array.from(list);
  result.splice(index, 1);
  result.splice(index, 0, newItem);

  return result;
};

const filter = (obj: object, validKeys: string[]) => {
  return validKeys.reduce((acc, item) => {
    if (typeof obj[item] !== "undefined") {
      return { ...acc, [item]: obj[item] };
    }

    return acc;
  }, {});
};

const Space = () => <div style={{ marginBottom: 16 }} />;

export default function Puck({
  config,
  initialData,
  onChange,
  onPublish,
}: {
  config: Config;
  initialData: Data;
  onChange?: (data: Data) => void;
  onPublish: (data: Data) => void;
}) {
  const [data, setData] = useState(initialData);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lockedFields, setLockedFields] = useState<string[]>([]);

  const { Base: BaseConfig, ...configWithoutBase } = config;

  const Base = BaseConfig?.render || Fragment;

  const fields =
    selectedIndex !== null
      ? (config[data[selectedIndex].type].fields as Record<
          string,
          Field<any>
        >) || {}
      : {};

  useEffect(() => {
    if (onChange) onChange(data);
  }, [data, onChange]);

  return (
    <>
      <DragDropContext
        onDragEnd={(droppedItem) => {
          // New component
          if (droppedItem.source.droppableId === "component-list") {
            const emptyComponentData = {
              type: droppedItem.draggableId,
              props: {
                id: `${droppedItem.draggableId}-${new Date().getTime()}`, // TODO make random string
              },
            };

            const newData = [...data];

            newData.splice(
              droppedItem.destination.index,
              0,
              emptyComponentData
            );

            setData(newData);
          } else {
            setData(
              reorder(
                data,
                droppedItem.source.index,
                droppedItem.destination.index
              )
            );
          }
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateAreas: '"header header header" "left editor right"',
            gridTemplateColumns: "256px auto 256px",
            gridTemplateRows: "min-content auto",
            height: "100vh",
            position: "fixed",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <header
            style={{
              display: "flex",

              gridArea: "header",
              borderBottom: "1px solid #cccccc",
              padding: 16,
            }}
          >
            <button
              onClick={() => onPublish(data)}
              style={{
                marginLeft: "auto",
                background: "var(--color-blue)",
                border: "none",
                borderRadius: 4,
                padding: "12px 16px",
                color: "white",
                fontWeight: 600,
              }}
            >
              Publish
            </button>
          </header>
          <div style={{ gridArea: "left" }}>
            <div
              style={{
                borderBottom: "1px solid #dedede",
                padding: 16,
              }}
            >
              <h4>Outline</h4>
              <Space />
              <OutlineList>
                {data.map((item, i) => {
                  return (
                    <OutlineList.Item
                      key={i}
                      onClick={() => {
                        setSelectedIndex(i);
                      }}
                    >
                      {item.type}
                    </OutlineList.Item>
                  );
                })}
              </OutlineList>
            </div>
            <div style={{ padding: 16 }}>
              <h4>Components</h4>
              <Space />
              <ComponentList config={configWithoutBase} />
            </div>
          </div>
          <div
            style={{
              background: "#dedede",
              padding: 32,
              overflowY: "auto",
              gridArea: "editor",
            }}
            onClick={() => setSelectedIndex(null)}
          >
            <div
              style={{
                background: "#eee",
                border: "1px solid #dedede",
                borderRadius: 32,
                overflow: "hidden",
              }}
            >
              <Base>
                <DroppableStrictMode droppableId="droppable">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      style={{
                        minHeight: "calc(100vh - 32px)",
                        background: snapshot.isDraggingOver
                          ? "lightblue"
                          : "white",
                        zoom: 0.75,
                      }}
                    >
                      {data.map((item, i) => {
                        return (
                          <DraggableComponent
                            key={item.props.id}
                            id={`draggable-${item.props.id}`}
                            index={i}
                            isSelected={selectedIndex === i}
                            onClick={(e) => {
                              setSelectedIndex(i);
                              e.stopPropagation();
                            }}
                            onDelete={(e) => {
                              const newData = [...data];
                              newData.splice(i, 1);

                              setSelectedIndex(null);
                              setData(newData);

                              e.stopPropagation();
                            }}
                            onDuplicate={(e) => {
                              const newData = [...data];
                              const newItem = {
                                ...newData[i],
                                props: {
                                  ...newData[i].props,
                                  id: `${
                                    newData[i].type
                                  }-${new Date().getTime()}`,
                                },
                              };

                              newData.splice(i + 1, 0, newItem);

                              setData(newData);

                              e.stopPropagation();
                            }}
                          >
                            {config[item.type].render(item.props)}
                          </DraggableComponent>
                        );
                      })}

                      {provided.placeholder}
                    </div>
                  )}
                </DroppableStrictMode>
              </Base>
            </div>
          </div>
          <div style={{ padding: 16, overflowY: "scroll", gridArea: "right" }}>
            {selectedIndex !== null ? (
              <>
                <h2>{data[selectedIndex].type}</h2>

                <Space />

                {Object.keys(fields).map((fieldName) => {
                  const field = fields[fieldName];

                  return (
                    <InputOrGroup
                      key={`${data[selectedIndex].props.id}_${fieldName}`}
                      field={field}
                      name={fieldName}
                      readOnly={lockedFields.indexOf(fieldName) > -1}
                      value={data[selectedIndex].props[fieldName]}
                      onChange={(value) => {
                        // In case of _data, we replace everything
                        if (fieldName === "_data") {
                          // Reset the link if value is falsey
                          if (!value) {
                            setData(
                              replace(data, selectedIndex, {
                                ...data[selectedIndex],
                                props: {
                                  ...data[selectedIndex].props,
                                  _data: undefined,
                                },
                              })
                            );

                            setLockedFields([]);

                            return;
                          }

                          const changedFields = filter(
                            // filter out anything not supported by this component
                            (value as any).attributes, // TODO type properly after getting proper state library
                            Object.keys(fields)
                          );

                          setData(
                            replace(data, selectedIndex, {
                              ...data[selectedIndex],
                              props: {
                                ...data[selectedIndex].props,
                                ...changedFields,
                                _data: value, // TODO perf - this is duplicative and will make payload larger
                              },
                            })
                          );

                          setLockedFields(Object.keys(changedFields));
                        } else {
                          setData(
                            replace(data, selectedIndex, {
                              ...data[selectedIndex],
                              props: {
                                ...data[selectedIndex].props,
                                [fieldName]: value,
                              },
                            })
                          );
                        }
                      }}
                    />
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
      </DragDropContext>
    </>
  );
}
