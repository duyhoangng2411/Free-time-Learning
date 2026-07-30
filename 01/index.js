const cards = document.querySelectorAll('.card');
let classes = ['c1','c2','c3','c4','c5'];
cards.forEach((card, index) => {
card.addEventListener('click', () => {
rotateCards();
});
});
function rotateCards() {
classes.unshift(classes.pop()); // rotate array
cards.forEach((card, i) => {
card.className = 'card ' + classes[i];
});
}