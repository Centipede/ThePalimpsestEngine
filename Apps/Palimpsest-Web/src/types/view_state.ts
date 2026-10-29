export interface FoldTrigger {
    command: 'expand-all' | 'collapse-all';
    count: number;
}

export interface ToolbarToggle {
    name: string;
    type: string;
    checked: boolean;
    disabled?: boolean;
}