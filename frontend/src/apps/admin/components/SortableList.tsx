import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/format";

/**
 * A vertical list reordered by dragging the grip, or from the keyboard
 * (focus the grip, Space to pick up, arrows to move, Space to drop).
 */
export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  label,
  disabled,
  className,
  itemId = (item) => (item as { id: number | string }).id,
}: {
  items: readonly T[];
  /** Stable identity of an item; defaults to its `id`. */
  itemId?: (item: T) => number | string;
  /** The reordered list, plus where the moved item came from and went to. */
  onReorder: (items: T[], from: number, to: number) => void;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  /** What one item is, for the grip's label ("Move Booking"). */
  label: (item: T) => string;
  disabled?: boolean;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => itemId(item) === active.id);
    const to = items.findIndex((item) => itemId(item) === over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove([...items], from, to), from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map(itemId)}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <ul className={className}>
          {items.map((item) => (
            <SortableRow
              key={itemId(item)}
              id={itemId(item)}
              label={label(item)}
              disabled={disabled}
            >
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  disabled,
  children,
}: {
  id: number | string;
  label: string;
  disabled?: boolean;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const handle = disabled ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Move ${label}`}
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-control text-ink-subtle hover:bg-surface-muted hover:text-ink active:cursor-grabbing"
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80 shadow-overlay")}
    >
      {children(handle)}
    </li>
  );
}
