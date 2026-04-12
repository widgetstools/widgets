const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function NumberRenderer(params: any) {
  if (params.value == null) return null;
  return fmt.format(params.value);
}
