const fmt = new Intl.NumberFormat('en-US');

export function QuantityRenderer(params: any) {
  if (params.value == null) return null;
  return fmt.format(params.value);
}
