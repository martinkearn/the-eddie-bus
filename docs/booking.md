# Booking system

A way to see availability online and to request ad-hoc bookings.

## User View
- A calendar which shows available / not available for each date
- An ability to complete a form to request booking for a specific available date. Fields include:
    - Date for booking - date picker (required)
    - Name of organisation or group - text (required)
    - Destination name - text (required) 
    - Destination address - text (optional)
    - Pickup time - time picker (not date) (required)
    - Contact name - text (required)
    - Contact email - text (required)
    - Contact number - text (required)
    - Static wheelchairs - yes/no 
    - Powered wheelchairs - yes/no
    - Are there any passenger transfers from wheelchair to bus seat - yes/no
    - Any special requirements - long text (optional)
- After form submission, the rest of the process is via email/phone

## Admin View
- Password protected
- A more detailed view on the bookings
- Ability to add/edit/remove bookings
- Part of an "admin" section of the site
- Additional admin-only booking fields (not shown on public booking request form):
    - Start mileage - number
    - Finish mileage - number
    - Non billable mileage - number
    - Checklist: Lights & indicators - yes/no
    - Checklist: Tyres - yes/no
    - Checklist: Wheel nuts - yes/no
    - Checklist: Bodywork - yes/no
    - Checklist: Mirrors & glass - yes/no
    - Checklist: Brakes - yes/no
    - Checklist: Steering - yes/no
    - Checklist: Wipers & washers - yes/no
    - Checklist: Dashboard warning lights - yes/no
    - Checklist: Seats & seatbelts - yes/no
    - Checklist: Emergency equipment - yes/no
    - Checklist: Wheelchair lifts & restraints - yes/no
    - Checklist: Tail lifts - yes/no
    - Vehicle check date - date (optional)
    - Signed - text (optional)
    - Faults recorded - long text (optional)

## Driver View
- As admin view but read only
- Ability to self-nominate for a booking