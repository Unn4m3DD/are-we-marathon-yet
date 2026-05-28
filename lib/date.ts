export function format(date: Date, format: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const weekday = d.getDay();

  return format
    .replace('yyyy', year.toString())
    .replace('MMM', months[month])
    .replace('MM', (month + 1).toString().padStart(2, '0'))
    .replace('dd', day.toString().padStart(2, '0'))
    .replace('d', day.toString())
    .replace('EEEE', days[weekday])
    .replace('EEE', days[weekday].slice(0, 3));
}