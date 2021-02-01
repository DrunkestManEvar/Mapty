'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sortBtn = document.querySelector('.sort-btn');
const deleteAllBtn = document.querySelector('.delete-all-btn');
const errorMsg = document.querySelector('.msg--error');
const successMsg = document.querySelector('.msg--success');

class Workout {
  id = (Date.now() + '').slice(-10);
  #date = new Date();

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.#date.getMonth()]
    } ${this.#date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this._calcSpeed();
    this._setDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #currentMarker;
  #editing = false;
  #sorted = false;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevation);
    containerWorkouts.addEventListener('click', this._panMap.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    sortBtn.addEventListener('click', this._sortWorkouts.bind(this));
    deleteAllBtn.addEventListener('click', this._deleteAllWorkouts.bind(this));
    this._setDeleteAndSortBtns();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        console.log('Error fetching location')
      );
  }

  _loadMap(position) {
    const { longitude, latitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(
      coords, // swap with coords
      this.#mapZoomLevel
    );

    L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZHJ1bmtlc3RtYW5ldmFyIiwiYSI6ImNrajRiMHpyMDVwMDUzMXFqcnhhMHl0bDMifQ.s_a7cbxqJuvl4UsuBMGOMA',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          'pk.eyJ1IjoiZHJ1bmtlc3RtYW5ldmFyIiwiYSI6ImNrajRiMHpyMDVwMDUzMXFqcnhhMHl0bDMifQ.s_a7cbxqJuvl4UsuBMGOMA',
      }
    ).addTo(this.#map);

    this.#map.on('click', mapE => {
      this.#mapEvent = mapE;
      this._showForm();
    });

    this.#workouts.forEach(workout => this._showMarker(workout));
  }

  _panMap(e) {
    const clickedWorkout = e.target.closest('.workout');

    if (
      !clickedWorkout ||
      e.target.classList.contains('fa-trash-alt') ||
      e.target.classList.contains('fa-edit')
    )
      return;

    const workoutToPanTo = this.#workouts.find(
      workout => workout.id === clickedWorkout.dataset.id
    );

    this.#map.setView(workoutToPanTo.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
        animate: true,
      },
    });
  }

  _showForm() {
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevation() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

    for (const input of form.querySelectorAll('input')) {
      if (!input.value) {
        input.focus();
        break;
      }
    }
  }

  _showElevationOrCadence(itemToEdit) {
    if (itemToEdit.type === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    } else {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
    }
  }

  _editFormValues(itemToEdit) {
    inputDistance.value = itemToEdit.distance;
    inputDuration.value = itemToEdit.duration;

    if (itemToEdit.type === 'running') {
      inputType.value = 'running';
      inputCadence.value = itemToEdit.cadence;
    }

    if (itemToEdit.type === 'cycling') {
      inputType.value = 'cycling';
      inputElevation.value = itemToEdit.elevation;
    }
  }

  _showErrorMsg(...formFields) {
    // Flash invalid fields backgrounds
    formFields.forEach(field => {
      if (!field.value) {
        field.classList.add('form__input--invalid');
        setTimeout(() => field.classList.remove('form__input--invalid'), 1900);
      }
    });
    // Show error msg
    errorMsg.classList.remove('msg--hidden');
    setTimeout(() => errorMsg.classList.add('msg--hidden'), 4000);
  }

  _showSuccessMsg() {
    successMsg.classList.remove('msg--hidden');
    setTimeout(() => successMsg.classList.add('msg--hidden'), 4000);
  }

  _newWorkout(e) {
    e.preventDefault();

    if (this.#editing === true) return;

    const validInputs = inputs => inputs.every(input => Number.isFinite(input));
    const positiveInputs = inputs => inputs.every(input => input > 0);

    const { lat, lng } = this.#mapEvent.latlng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevationGain = +inputElevation.value;
    let workout;

    if (type === 'running') {
      if (
        !validInputs([distance, duration, cadence]) ||
        !positiveInputs([distance, duration, cadence])
      ) {
        this._showErrorMsg(inputDistance, inputDuration, inputCadence);
        return;
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      if (!validInputs([distance, duration, elevationGain])) {
        this._showErrorMsg(inputDistance, inputDuration, inputElevation);
        return;
      }

      if (!positiveInputs([distance, duration])) {
        this._showErrorMsg(inputDistance, inputDuration);
        return;
      }

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    this.#workouts.push(workout);
    this._setLocalStorage();
    this._hideForm();
    this._showWorkout(workout);
    this._showMarker(workout);
    this._setDeleteAndSortBtns();
    this._showSuccessMsg();
  }

  _editWorkout(e) {
    const editIcon = e.target.classList.contains('fa-edit') ? e.target : null;

    if (!editIcon) return;

    this.#editing = true;

    const itemToEditId = editIcon.closest('.workout').dataset.id;
    const itemToEdit = this.#workouts.find(
      workout => workout.id === itemToEditId
    );

    this._showForm();
    this._showElevationOrCadence(itemToEdit);
    this._editFormValues(itemToEdit);
    form.dataset.id = itemToEditId;
    form.addEventListener('submit', this._submitEdit.bind(this, e));
  }

  _submitEdit(e) {
    e.preventDefault();

    if (this.#editing === false) return;

    const itemToEdit = this.#workouts.find(
      workout => workout.id === form.dataset.id
    );

    this.#workouts = this.#workouts.map(workout => {
      if (workout.id === form.dataset.id) {
        workout.distance = +inputDistance.value;
        workout.duration = +inputDuration.value;

        workout.type === 'running'
          ? (workout.cadence = +inputCadence.value)
          : (workout.elevation = +inputElevation.value);
      }

      return workout;
    });

    const workoutToEditDOM = Array.from(
      containerWorkouts.querySelectorAll('.workout')
    ).find(workoutEl => workoutEl.dataset.id === form.dataset.id);

    this._editWorkoutDOM(workoutToEditDOM, itemToEdit);

    this._setLocalStorage();

    this._hideForm();

    form.removeEventListener('submit', this._submitEdit);
    this.#editing = false;
  }

  _deleteWorkout(e) {
    const trashIcon = e.target.classList.contains('fa-trash-alt')
      ? e.target
      : null;

    if (!trashIcon) return;

    // Delete from #workouts and set localStorage
    const itemToDeleteId = trashIcon.closest('.workout').dataset.id;

    const itemToDelete = this.#workouts.find(
      workout => workout.id === itemToDeleteId
    );

    const itemToDeleteIndex = this.#workouts.indexOf(itemToDelete);

    this.#workouts.splice(itemToDeleteIndex, 1);

    this._setLocalStorage();

    // Delete from UI
    trashIcon.closest('.workout').remove();
    this.#markers.find(marker => {
      if (marker.workoutId === itemToDeleteId) {
        marker.remove();
      }
    });

    this._setDeleteAndSortBtns();
  }

  _sortWorkouts() {
    // CLear DOM
    document.querySelectorAll('.workout').forEach(workout => workout.remove());

    if (this.#sorted === false) {
      const workoutsToDisplay = this.#workouts
        .slice()
        .sort((a, b) => a.distance - b.distance);

      // Fill DOM with sorted workouts
      workoutsToDisplay.forEach(workout => {
        this._showWorkout(workout);
      });
    }

    if (this.#sorted === true)
      this.#workouts.forEach(workout => this._showWorkout(workout));

    this.#sorted = !this.#sorted;
  }

  _deleteAllWorkouts() {
    this.#workouts = [];
    this._setLocalStorage();

    containerWorkouts
      .querySelectorAll('.workout')
      .forEach(workout => workout.remove());
    this.#markers.forEach(marker => marker.remove());

    this._setDeleteAndSortBtns();
  }

  _showWorkout(workout) {
    let workoutListItem = `
      <li class="workout workout--${workout.type}" data-id=${workout.id}>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__buttons"><i class="far fa-edit workout-btn"></i><i class="far fa-trash-alt workout-btn"></i></div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
      workoutListItem += `
        <div class="workout__details">
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
    }

    if (workout.type === 'cycling') {
      workoutListItem += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
      `;
    }

    form.insertAdjacentHTML('afterend', workoutListItem);
  }

  _editWorkoutDOM(elDOM, editedItem) {
    elDOM.innerHTML = `
          <h2 class="workout__title">${editedItem.description}</h2>
          <div class="workout__buttons"><i class="far fa-edit workout-btn"></i><i class="far fa-trash-alt workout-btn"></i></div>
          <div class="workout__details">
            <span class="workout__icon">${
              editedItem.type === 'running' ? '🏃‍♂' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${editedItem.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${editedItem.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (editedItem.type === 'running') {
      elDOM.innerHTML += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${editedItem.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${editedItem.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
      `;
    }

    if (editedItem.type === 'cycling') {
      elDOM.innerHTML += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${editedItem.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${editedItem.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        `;
    }
  }

  _showMarker(workout) {
    this.#currentMarker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .openPopup()
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      );
    this.#currentMarker.workoutId = workout.id;
    this.#markers.push(this.#currentMarker);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    data.forEach(dataItem => {
      if (dataItem.type === 'running') {
        const running = new Running(
          dataItem.coords,
          dataItem.distance,
          dataItem.duration,
          dataItem.cadence
        );
        running.id = dataItem.id;
        this.#workouts.push(running);
      }

      if (dataItem.type === 'cycling') {
        const cycling = new Cycling(
          dataItem.coords,
          dataItem.distance,
          dataItem.duration,
          dataItem.elevation
        );
        cycling.id = dataItem.id;
        this.#workouts.push(cycling);
      }
    });

    this.#workouts.forEach(workout => this._showWorkout(workout));
  }

  _setDeleteAndSortBtns() {
    if (this.#workouts.length === 0) {
      deleteAllBtn.disabled = true;
      sortBtn.disabled = true;
    } else {
      deleteAllBtn.disabled = false;
      sortBtn.disabled = false;
    }
  }
}

const app = new App();
