const navSearchInput = document.getElementById('nav-search-input');
const searchResult = document.getElementById('search-result');

// Listen for input events (including when the "X" is clicked)
navSearchInput.addEventListener('input', function () {
    if (this.value === '') {
        searchResult.innerHTML = ''; // Clear search result
    }
});

let dailyCalorieIntake = 0;
let totalConsumedCalories = 0;

document.getElementById('height-unit').addEventListener('change', toggleHeightInput);

document.getElementById('calculate-btn').addEventListener('click', calculateDailyCalories);
document.getElementById('add-food').addEventListener('click', handleAddFood);
document.getElementById('nav-search-form').addEventListener('submit', handleSearchSubmit);

// Handle switching between height units
function toggleHeightInput() {
    const unit = this.value;
    document.getElementById('height-cm').style.display = unit === 'cm' ? 'block' : 'none';
    document.getElementById('height-ft-in').style.display = unit === 'cm' ? 'none' : 'flex';
}
let caloriesCalculated = false;
// Calculate daily calorie intake
function calculateDailyCalories() {
  
    const ageInput = document.getElementById('age').value;
const age = parseInt(ageInput);

if (isNaN(age) || age < 1 || age >100 ) {
    alert("Please enter a valid age between 1 and 100.");
    return;
}
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const activity = document.getElementById('Dropdown').value;
    const goal = document.getElementById('goal').value;

    const height = getHeightInCm();
console.log("Height in cm:", getHeightInCm());
    if (!age || !weight || !height || !gender) {
        alert("Please enter all required fields.");
        return;
    }

    let bmr = gender === "Male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const activityMultipliers = {
        option1: 1.2,
        option2: 1.375,
        option3: 1.55,
        option4: 1.725
    };

    let baseCalories = bmr * (activityMultipliers[activity] || 1.2);

    switch (goal) {
        case "loss":
            baseCalories -= 500;
            break;
        case "extreme-loss":
            baseCalories -= 1000;
            break;
        case "gain":
            baseCalories += 500;
            break;
    }

    dailyCalorieIntake = Math.max(1200, Math.round(baseCalories));

    document.getElementById('calorie-result').innerHTML = `
        <strong>Your daily calorie intake should be approximately ${dailyCalorieIntake} calories.</strong>
    `;
    document.getElementById('food-name').disabled = false;
document.getElementById('food-calories').disabled = false;
document.getElementById('add-food').disabled = false;
caloriesCalculated = true;
}

// Convert height to cm
function getHeightInCm() {
    const unit = document.getElementById('height-unit').value;
    if (unit === 'cm') {
        const cmValue = document.getElementById('height-cm-input').value.trim();
        const cm = parseFloat(cmValue);
        if (!cmValue || isNaN(cm) || cm <= 0) {
            return null;
        }
        return cm;
    } else {
        const ft = parseFloat(document.getElementById('height-ft').value.trim());
        const inch = parseFloat(document.getElementById('height-in').value.trim());
        if (isNaN(ft) || isNaN(inch) || ft < 0 || inch < 0) {
            return null;
        }
        return (ft * 30.48) + (inch * 2.54);
    }
}


// Handle adding food and calories
async function handleAddFood() {
    if (!caloriesCalculated) {
        alert("Please calculate your daily calorie needs before adding food intake.");
        return;
    }
    const foodName = document.getElementById('food-name').value.trim();
    const servings = parseInt(document.getElementById('food-calories').value);

    if (!foodName || isNaN(servings) || servings <= 0) {
        alert("Please enter a valid food item and number of servings.");
        return;
    }

    const foodData = await getCaloriesFromAPI(foodName, servings);
    if (!foodData) return;

    const { name, calories, servingQty, servingUnit, servingWeight } = foodData;

    // Check for common liquid indicators
    const isLiquid = /ml|l|liter|litre|fluid|cup|oz|juice|milk|water|tea|coffee|soup|drink|smoothie|soda/i.test(name);

    let quantityInfo = '';
    if (isLiquid) {
        const ml = Math.round(servingWeight); // weight in grams ≈ volume in ml for liquids
        if (ml >= 1000) {
            quantityInfo = `${(ml / 1000).toFixed(2)} L`;
        } else {
            quantityInfo = `${ml} ml`;
        }
    } else {
        quantityInfo = `${servingQty} ${servingUnit} (${servingWeight}g)`;
    }

    totalConsumedCalories += calories;
    updateCalorieDisplay();

    const foodList = document.getElementById('food-list');
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `
        <strong>${name}</strong> (${servings} servings = ${quantityInfo}) - 
        <strong>${calories} kcal</strong>
        <button class="btn btn-sm btn-outline-danger float-end delete-food">Remove</button>
    `;
    foodList.appendChild(listItem);

    listItem.querySelector('.delete-food').addEventListener('click', () => {
        foodList.removeChild(listItem);
        totalConsumedCalories -= calories;
        updateCalorieDisplay();
    });

    // Clear inputs
    document.getElementById('food-name').value = '';
    document.getElementById('food-calories').value = '';
}


// Update calorie summary display
function updateCalorieDisplay() {

    const remaining = Math.max(0, dailyCalorieIntake - totalConsumedCalories);
    document.getElementById('total-calories').innerHTML = `
        Total consumed calories: <strong>${totalConsumedCalories}</strong>. 
        Remaining calories: <strong>${remaining}</strong>.
    `;

    if (totalConsumedCalories > dailyCalorieIntake) {
        suggestWorkouts(totalConsumedCalories - dailyCalorieIntake);
    }
}

// Fetch calories from Nutritionix API
async function getCaloriesFromAPI(foodItem, servings) {
    const appId = '180562df';
    const appKey = '27ffb69d81d85bde44bd54b69bff4f46';
    const url = "https://trackapi.nutritionix.com/v2/natural/nutrients";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-app-id": appId,
                "x-app-key": appKey
            },
            body: JSON.stringify({ query: `${servings} ${foodItem}` })
        });

        if (!response.ok) throw new Error("Failed to fetch data");

        const data = await response.json();
        const food = data.foods[0];

        if (!food) return null;

        return {
            name: food.food_name,
            calories: Math.round(food.nf_calories),
            servingQty: food.serving_qty,
            servingUnit: food.serving_unit,
            servingWeight: food.serving_weight_grams
        };

    } catch (err) {
        console.error("Error fetching data:", err);
        alert("Error retrieving calorie data. Please try again.");
        return null;
    }
}

// Suggest workouts to burn excess calories
function suggestWorkouts(extraCalories) {
    const workoutOptions = [
        { workout: "Running", burnRate: 10 },
        { workout: "Cycling", burnRate: 8 },
        { workout: "Swimming", burnRate: 14 },
        { workout: "Strength Training", burnRate: 7 }
    ];

    let suggestions = "<strong>Suggested workouts to burn extra calories:</strong>";
    workoutOptions.forEach(({ workout, burnRate }) => {
        const minutes = Math.ceil(extraCalories / burnRate);
        suggestions += `<br> - ${minutes} minutes of ${workout}`;
    });

    document.getElementById('total-calories').innerHTML += `<br>${suggestions}`;
}

// Handle food search form
async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = document.getElementById('nav-search-input').value.trim();

    if (!query) {
        alert("Please enter a food item.");
        return;
    }

    const appId = '180562df';
    const appKey = '27ffb69d81d85bde44bd54b69bff4f46';
    const url = "https://trackapi.nutritionix.com/v2/natural/nutrients";

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "x-app-id": appId,
                "x-app-key": appKey
            },
            body: JSON.stringify({ query })
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        const food = data.foods[0];

        if (!food) {
            document.getElementById('search-result').innerHTML = "<p>No data found.</p>";
            return;
        }

        document.getElementById('search-result').innerHTML = `
            <div class="card p-3 shadow-sm">
                <h5 class="mb-0">Nutritional Info for <strong>${food.food_name}</strong></h5>
                <ul class="mb-0">
                    <li><strong>Calories:</strong> ${food.nf_calories} kcal</li>
                    <li><strong>Protein:</strong> ${food.nf_protein} g</li>
                    <li><strong>Carbs:</strong> ${food.nf_total_carbohydrate} g</li>
                    <li><strong>Fat:</strong> ${food.nf_total_fat} g</li>
                    <li><strong>Serving Size:</strong> ${food.serving_qty} ${food.serving_unit} (${food.serving_weight_grams} g)</li>
                </ul>
                <div class="d-flex justify-content-center align-items-center mb-3">
                ${(food.photo.highres && !food.photo.highres.includes("nutritionix.com")) ? `
                    <div class="d-flex justify-content-center align-items-center mb-3">
                        <img src="${food.photo.highres}" alt="${food.food_name}" class="me-3" style="width: 150px; height: 150px; object-fit: cover; border-radius: 1.5rem;">
                    </div>` : ''}
                
</div>

            </div>
        `;
    } catch (err) {
        console.error("Error:", err);
        document.getElementById('search-result').innerHTML = 
            "<p style='background-color: white; padding: 10px; border-radius: 5px; color: red;'>Invalid input. Try again.</p>";
    }    
}
// Save form data before navigating away
window.addEventListener('beforeunload', () => {
    const formData = {
        age: document.getElementById('age').value,
        gender: document.querySelector('input[name="gender"]:checked')?.value,
        weight: document.getElementById('weight').value,
        heightUnit: document.getElementById('height-unit').value,
        heightCm: document.getElementById('height-cm-input').value,
        heightFt: document.getElementById('height-ft').value,
        heightIn: document.getElementById('height-in').value,
        goal: document.getElementById('goal').value,
        activity: document.getElementById('Dropdown').value
    };
    localStorage.setItem('calorieFormData', JSON.stringify(formData));
});

// Restore form data on page load
window.addEventListener('DOMContentLoaded', () => {
    const saved = JSON.parse(localStorage.getItem('calorieFormData'));
    if (saved) {
        document.getElementById('age').value = saved.age || '';
        if (saved.gender) {
            document.querySelector(`input[name="gender"][value="${saved.gender}"]`).checked = true;
        }
        document.getElementById('weight').value = saved.weight || '';
        document.getElementById('height-unit').value = saved.heightUnit || 'cm';
        document.getElementById('height-cm-input').value = saved.heightCm || '';
        document.getElementById('height-ft').value = saved.heightFt || '';
        document.getElementById('height-in').value = saved.heightIn || '';
        document.getElementById('goal').value = saved.goal || '';
        document.getElementById('Dropdown').value = saved.activity || '';
    }
});
