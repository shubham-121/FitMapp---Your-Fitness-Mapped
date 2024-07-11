'use strict';

//common class for cycling and running

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.distance = distance; //in km
    this.duration = duration; // in mins
    this.coords = coords; // [lat,lng]
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//for creating running objects
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//for creating cycling objects
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//Testing
const run1 = new Running([30, 78], 5.2, 24, 178);
console.log(run1);

//Application architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//Parent class or main class
class App {
  #map; //Private properties
  #mapEvent;
  #workouts = []; //empty workout array for storing different workouts from the form

  constructor() {
    //runs as soons as the page loads
    //Get user's position
    this._getPosition();

    //Get data from the local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); //this will point to the newWorkout in APP class, rather than to the parent it is attached to here

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Cannot access the location');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    const url = `https://www.google.com/maps/@${latitude},${longitude},12z?entry=ttu`;

    this.#map = L.map('map').setView(coords, 14);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    console.log(url);

    //Handling clicks on the map
    this.#map.on('click', this._showForm.bind(this));

    //Load workouts from the local storage if any exists after reloading the page
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work); //only works after the page is loaded completely  //ASYNC works basically
    });
  }

  //render a workout form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //hide the form after rendering an workout
  _hideForm() {
    //prettier-ignore
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //Toggling between cadence(for running) and  elevation (for cycling)
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    event.preventDefault();

    //function for data validation
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    //function for checking positive inputs only
    const allPositives = (...inputs) => inputs.every(inp => inp > 0);

    //1-Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; //get coords of the clicked area
    let workout;

    //2-check if data is valid AND 3-if workout=running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid

      //1st way without using data validation func
      // if (
      //   !Number.isFinite(distance) ||
      //   !Number.isFinite(duration) ||
      //   !Number.isFinite(cadence)
      // )

      //2nd way using a data validation function above
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      )
        return alert('Inputs has to be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //4-if workout=cycling, create cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositives(distance, duration) //here elevation can be negative
      )
        return alert('Inputs has to be a positive number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //5-Add new object to the workout array
    this.#workouts.push(workout);
    console.log(workout);

    //6-render the workout on the map as marker

    console.log(lat, lng);

    //7-Display marker on the  map
    this._renderWorkoutMarker(workout);

    //8-render workout on the list
    this._renderWorkout(workout);

    //9-hide form + clear the input fields

    //clear the input fields
    this._hideForm();

    //set local storage to all workouts
    this._setLocalstorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        ` ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    //prettier-ignore
    let html = 
         `<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    //prettier-ignore
    if (workout.type==='running')
        html += ` <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === 'cycling')
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> -->`;

    form.insertAdjacentHTML('afterend', html);

    console.log('executed');
  }

  //Map pans(moves) when a workout is clicked in the left form
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: {
        animate: true,
        duration: 3,
      },
    });
  }

  //Store workouts in local storage
  _setLocalstorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); //setItem(key string ,value in string)
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work);
    });
  }

  //Clear local storage
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//Calling the App class object (main class)

const app = new App();

const deleteBtn = document.querySelector('.delete-btn'); //if you want to clear the local storage
deleteBtn.addEventListener('click', e => {
  e.preventDefault();
  app.reset();
});

//ALso note-> objects coming from the local storage would not inherit all the propertires just like before they were saved in the storage.
//They will lack certain properties
