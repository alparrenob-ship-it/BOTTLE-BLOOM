const processSteps = [
  ['Selección', 'Se eligen las botellas PET clasificadas como reutilizables.'],
  ['Limpieza', 'Se lavan y desinfectan para eliminar residuos y etiquetas.'],
  ['Preparación', 'Se trituran en caso necesario para facilitar el llenado.'],
  ['Llenado', 'Se llenan con biofertilizante orgánico producido en ZooBotánica.'],
  ['Sellado', 'Se cierran herméticamente para conservar su calidad.'],
  ['Identificación', 'Se coloca una etiqueta con QR único para trazabilidad.'],
  ['Distribución', 'Quedan listas para uso en la comunidad y áreas verdes.']
];

const conversionSteps = [
  ['Selección', 'Las botellas PET que cumplen con los criterios de reutilización son seleccionadas.', 'Criterios: sin roturas, sin deformaciones, limpias y secas, aptas para rellenar.', 'assets/1.%20SELECCI%C3%93N.png'],
  ['Limpieza profunda', 'Se realiza un lavado industrial con agua y productos biodegradables.', 'Resultado: botellas limpias y listas para ser transformadas.', 'assets/2.%20LIMPIEZA%20PROFUNDA.png'],
  ['Preparación', 'Si es necesario, las botellas se trituran en escamas pequeñas para facilitar el llenado o compactación.', 'Tecnología: control de calidad del material.', 'assets/3.%20PREPARACI%C3%93N.png'],
  ['Llenado con biofertilizante', 'Se llenan con biofertilizante orgánico producido por ZooBotánica.', 'Biofertilizante: rico en nutrientes y mejora la calidad del suelo.', 'assets/4.%20LLENADO.png'],
  ['Sellado hermético', 'Las botellas se sellan herméticamente para garantizar la conservación.', 'Seguridad: evita derrames y conserva el producto por más tiempo.', 'assets/5.%20SELLADO.png'],
  ['Identificación con QR', 'Cada EcoBottle recibe una etiqueta con código QR único.', 'QR contiene: ID único, fecha, biofertilizante utilizado e impacto generado.', 'assets/6.%20QR.png'],
  ['Distribución y uso', 'Las EcoBottles se distribuyen para ser utilizadas en huertos, jardines y áreas verdes.', 'Uso recomendado: fertilizante líquido natural para plantas y reforestación.', 'assets/7.%20DISTRIBUCI%C3%93N%20Y%20USO.png']
];

const contents = [
  ['Nutrientes', 'Nitrógeno, fósforo y potasio para el crecimiento óptimo.'],
  ['Microorganismos', 'Beneficios que mejoran la salud del suelo.'],
  ['Extractos naturales', 'Compost, humus y residuos orgánicos aprovechados.'],
  ['Aminoácidos', 'Naturales que fortalecen las plantas.'],
  ['Sin químicos', 'No contiene productos tóxicos ni sintéticos.'],
  ['100% orgánico', 'Seguro para plantas, personas y animales.']
];

const benefits = [
  ['Fertilidad', 'Mejora la fertilidad del suelo y su estructura.'],
  ['Resistencia', 'Aumenta la resistencia de las plantas a plagas y enfermedades.'],
  ['Crecimiento', 'Promueve un crecimiento más saludable y natural.'],
  ['Clima', 'Contribuye a la reducción de residuos y a la acción climática.']
];

const $ = (selector) => document.querySelector(selector);

function renderProcess() {
  const container = $('#processSteps');
  if (!container) return;
  container.innerHTML = processSteps.map((step, index) => `
    <article class="process-step">
      <span class="step-number">${index + 1}</span>
      <div class="step-orb">${String(index + 1).padStart(2, '0')}</div>
      <h3>${step[0]}</h3>
      <p>${step[1]}</p>
    </article>
  `).join('');
}

function renderConversion() {
  const container = $('#conversionList');
  if (!container) return;
  container.innerHTML = conversionSteps.map((step, index) => `
    <article class="conversion-item">
      <span class="conversion-index">${index + 1}</span>
      <div class="conversion-photo" aria-label="Foto del paso ${index + 1}: ${step[0]}">
        <img src="${step[3]}" alt="${index + 1}. ${step[0]}">
      </div>
      <div><h3>${step[0]}</h3><p>${step[1]}</p></div>
      <div class="detail-card"><strong>${step[2].split(':')[0]}:</strong><p>${step[2].split(':').slice(1).join(':').trim()}</p></div>
    </article>
  `).join('');
}

function renderLists() {
  const contentList = $('#contentList');
  const benefitList = $('#benefitList');
  if (contentList) {
    contentList.innerHTML = contents.map((item, index) => `
      <div class="content-item"><span>${index + 1}</span><div><strong>${item[0]}</strong><p>${item[1]}</p></div></div>
    `).join('');
  }
  if (benefitList) {
    benefitList.innerHTML = benefits.map((item, index) => `
      <div class="benefit-item"><span>${index + 1}</span><div><strong>${item[0]}</strong><p>${item[1]}</p></div></div>
    `).join('');
  }
}

function bindActions() {
  $('.collapse-btn')?.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
  $('.logout-btn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
}

document.addEventListener('DOMContentLoaded', () => {
  renderProcess();
  renderConversion();
  renderLists();
  bindActions();
});
