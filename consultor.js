const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Caminho automático para não dar erro de "file not found"
const caminhoDados = path.join(__dirname, 'perfumes.json');
const perfumes = JSON.parse(fs.readFileSync(caminhoDados, 'utf-8'));

//console.log("--- DEBUG DE CARREGAMENTO ---");
//console.log("Total de perfumes carregados:", perfumes.length);
//console.log("Conteúdo da lista:", JSON.stringify(perfumes, null, 2));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function calcularEstacao() {
    const mes = new Date().getMonth() + 1;
    if (mes >= 3 && mes <= 5) return "Outono";
    if (mes >= 6 && mes <= 8) return "Inverno";
    if (mes >= 9 && mes <= 11) return "Primavera";
    return "Verão";
}

console.log(`--- CONSULTOR DE PERFUMES LOCAL ---`);
const estacaoAtual = calcularEstacao();
console.log(`📅 Sistema: Detectado que estamos no ${estacaoAtual}.\n`);

rl.question('Qual o período? (dia/noite/ambos): ', (periodoInput) => {
        
        const periodo = (periodoInput || "").toLowerCase();

        //console.log("\n--- INICIANDO FILTRO ---");

        const filtro = perfumes.filter((p, index) => {
            //console.log(`> Verificando item ${index + 1}: ${p.nome}`);
            // Se o item estiver incompleto no JSON, ele pula para não dar erro
            if (!p.clima || !p.periodo) {
                //console.log("  ⚠️ Erro: Campos faltando neste item.");
                return false;
            }

            // Filtro de Clima
            const bateClima = p.clima.includes(estacaoAtual);

            // Filtro de Período (Aceita ["dia", "noite])
            const batePeriodo = (periodo === 'ambos' || periodo === 'os dois') 
                ? true 
                : p.periodo.some(per => per.toLowerCase() === periodo);

            // LINHA PARA DEBUGAR:
            //console.log(`  Resultados: Clima(${bateClima}), Período(${batePeriodo})`);
            //console.log(`Testando: ${p.nome} -> Clima: ${bateClima}, Período: ${batePeriodo}`);

            return bateClima && batePeriodo;
        });
        //console.log('--- FIM DO FILTRO ---\n');
        console.log('\n--- RESULTADO ---');
        if (filtro.length > 0) {
            console.log(`✨ Encontramos ${filtro.length} opção(ões) para você:`);
            filtro.forEach(p => {
                console.log(`- ${p.nome} [${p.periodo.join(' & ')}]`);
            });
        } else {
            console.log('❌ Nenhum perfume encontrado com esses critérios.');
        }

        rl.close();
    //});
});