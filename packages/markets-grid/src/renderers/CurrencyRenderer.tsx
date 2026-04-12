const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CurrencyRenderer(params: any) {
  if (params.value == null) return null;
  return fmt.format(params.value);
}
