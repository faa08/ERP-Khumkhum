declare module 'recharts' {
  export const ResponsiveContainer: any;
  export const BarChart: any;
  export const Bar: any;
  export const LineChart: any;
  export const Line: any;
  export const AreaChart: any;
  export const Area: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const Legend: any;
}

declare module 'jspdf' {
  const jsPDF: any;
  export default jsPDF;
  export { jsPDF };
}

declare module 'jspdf-autotable' {
  const autoTable: any;
  export default autoTable;
}

declare module 'xlsx' {
  const xlsx: any;
  export default xlsx;
  export const utils: any;
  export const writeFile: any;
}
