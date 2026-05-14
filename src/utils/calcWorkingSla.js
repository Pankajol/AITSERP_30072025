export function addWorkingMinutes(startDate, minutes, company){
  let date = new Date(startDate);
  let remaining = minutes;

  while(remaining>0){
    date.setMinutes(date.getMinutes()+1);

    const day = date.getDay();
    const hour = date.getHours();

    const isWorkingDay =
      company.workingHours.workingDays.includes(day);

    const isWorkingHour =
      hour>=company.workingHours.startHour &&
      hour<company.workingHours.endHour;

    if(isWorkingDay && isWorkingHour){
      remaining--;
    }
  }
  return date;
}