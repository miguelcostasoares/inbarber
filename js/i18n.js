/* ════════════════════════════════════════════════════════════════
   I18N — Corvo Barbearia
   Carrega ANTES do app.js.

   Antes, o seletor PT/EN/ES traduzia quatro strings do drawer e
   mudava <html lang> — a página ficava em português a dizer que
   estava em inglês. Agora cobre a landing inteira.

   Atributos suportados no HTML:
     data-i18n          → textContent
     data-i18n-html     → innerHTML   (títulos com <br> e <em>)
     data-i18n-aria     → aria-label
     data-i18n-alt      → alt
     data-i18n-placeholder → placeholder (inputs e textareas)
     data-i18n-content  → content     (metatags)

   Strings geradas em JS: I18N.t('chave', { var: valor })
   Ao mudar de idioma é disparado o evento 'i18n:change' em document.
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DICT = {

    /* ───────────────────────────── PORTUGUÊS ───────────────────────────── */
    pt: {
      'meta.title'   : 'Corvo Barbearia — Barbearia na Consolação, São Paulo',
      'meta.desc'    : 'Corte, barba e ritual completo na Rua Augusta, Consolação. Agende online em segundos, escolha o barbeiro e o horário.',
      'meta.ogTitle' : 'Corvo Barbearia — agende o seu corte em segundos',
      'meta.locale'  : 'pt_BR',
      'html.lang'    : 'pt-BR',

      'a11y.skip'        : 'Saltar para o conteúdo',
      'a11y.scroll'      : 'Ver mais',
      'a11y.motionPause' : 'Pausar animações',
      'a11y.motionPlay'  : 'Retomar animações',

      'nav.about'    : 'Sobre',
      'nav.services' : 'Serviços',
      'nav.team'     : 'Equipa',
      'nav.gallery'  : 'Galeria',
      'nav.location' : 'Localização',
      'nav.cta'      : 'Agendar',
      'nav.profile'  : 'Perfil',
      'nav.menu'     : 'Menu',

      'drawer.title'       : 'Menu',
      'drawer.close'       : 'Fechar menu',
      'drawer.book'        : 'Agendar horário',
      'drawer.book_sub'    : 'Escolha serviço, barbeiro e hora',
      'drawer.profile'     : 'Perfil',
      'drawer.profile_sub' : 'Gerir a sua conta',
      'drawer.language'    : 'Idioma',
      'drawer.langGroup'   : 'Selecionar idioma',
      'lang.label'         : 'Português',

      'tick.1': 'Corte Clássico',
      'tick.2': 'Barba Completa',
      'tick.3': 'Degradê',
      'tick.4': 'Pigmentação',
      'tick.5': 'Hot Towel Shave',
      'tick.6': 'Sobrancelha',
      'tick.7': 'Progressiva',

      'hero.eyebrow' : 'Desde 2013 · Arte &amp; Tradição',
      'hero.h1'      : 'Onde cada<br>detalhe<br><em>importa.</em>',
      'hero.desc'    : 'Cortes precisos. Ambiente exclusivo.<br>A experiência que você merece.',
      'hero.cta1'    : 'Agendar horário',
      'hero.cta2'    : 'Conhecer',
      'hero.stat1'   : 'Anos',
      'hero.stat2'   : 'Clientes',
      'hero.stat3'   : 'Avaliação',

      'slots.label'  : 'Próximos horários livres',
      'slots.all'    : 'Ver agenda completa →',
      'slots.today'  : 'Hoje',
      'slots.tomorrow': 'Amanhã',
      'slots.aria'   : 'Agendar {day} às {time}',
      'slots.closed' : 'Fechado agora — veja a agenda',

      'about.tag'   : 'Nossa história',
      'about.h'     : 'Uma tradição<br>de <em>excelência.</em>',
      'about.ph'    : 'Foto do ambiente',
      'about.badge' : 'Satisfação',
      'about.body'  : 'Nascemos com uma missão simples: resgatar o ritual do cuidado masculino. Cada corte é uma obra — técnica apurada, atenção ao detalhe e um ambiente que te faz sentir em casa.',
      'about.p1h'   : 'Técnica impecável',
      'about.p1b'   : 'Barbeiros certificados com anos de experiência em cortes clássicos e modernos.',
      'about.p2h'   : 'Ambiente exclusivo',
      'about.p2b'   : 'Um espaço pensado para relaxar enquanto cuidamos do seu visual.',
      'about.p3h'   : 'Produtos premium',
      'about.p3b'   : 'Só marcas selecionadas para o melhor resultado na barba e no cabelo.',

      'svc.tag'   : 'O que oferecemos',
      'svc.h'     : 'Monte seu<br><em>atendimento.</em>',
      'svc.hint'  : 'Toque nos serviços que deseja e veja o total na hora.',
      'svc.1badge': 'Mais pedido',
      'svc.1save' : 'poupa R$ 6',
      'svc.1name' : 'Corte + Barba',
      'svc.1desc' : 'Combo completo com lavagem, corte, barba na navalha e finalização.',
      'svc.2name' : 'Corte Social',
      'svc.2desc' : 'Corte clássico com tesoura e máquina, acabamento impecável.',
      'svc.3name' : 'Barba Clássica',
      'svc.3desc' : 'Barba modelada com navalha, toalha quente e hidratação.',
      'svc.4name' : 'Degradê',
      'svc.4desc' : 'Fade perfeito do zero ao comprimento desejado, sem marcas.',
      'svc.5name' : 'Pigmentação',
      'svc.5desc' : 'Cobertura de falhas e uniformização da cor da barba.',
      'svc.6name' : 'Hot Towel Shave',
      'svc.6desc' : 'Ritual completo com toalha quente, espuma e navalha reta.',
      'svc.7name' : 'Sobrancelha',
      'svc.7desc' : 'Design e definição com linha, pinça ou navalha.',
      'svc.term1' : 'Sem pagamento antecipado',
      'svc.term2' : 'Cancele até 2h antes, sem custo',
      'svc.term3' : 'Não precisa de conta para marcar',

      'team.tag'   : 'A nossa equipa',
      'team.h'     : 'Conheça quem cuida<br>do seu <em>visual.</em>',
      'team.sub'   : 'Profissionais apaixonados pelo que fazem. Clique para conhecer melhor cada um.',
      'team.cta'   : 'Agendar com',
      'team.avHint'      : 'ver perfil',
      'team.statCuts'    : 'Cortes',
      'team.statClients' : 'Clientes',
      'team.statYears'   : 'Anos',
      'team.modalSpecialties': 'Especialidades',
      'team.modalLangs'  : 'Idiomas',
      'team.modalPortfolio': 'Portfólio',
      'team.1role' : 'Degradê e navalha',
      'team.2role' : 'Clássicos e tesoura',
      'team.3role' : 'Barba e ritual quente',
      'team.4role' : 'Texturizados e visagismo',
      'team.1bio'  : 'Mestre do fade e especialista em cortes texturizados. Foco em atendimento personalizado e técnicas contemporâneas.',
      'team.2bio'  : 'Especialista em cortes clássicos e tesoura. Seis anos de dedicação ao ofício, com atenção ao detalhe e acabamento impecável.',
      'team.3bio'  : 'Dedicado à arte da barba e dos rituais quentes. Quatro anos transformando cada atendimento numa experiência de relaxamento.',
      'team.4bio'  : 'Especialista em texturizados e visagismo. Três anos criando cortes que valorizam o formato do rosto de cada cliente.',
      'team.1since': '9 anos na casa',
      'team.2since': '6 anos na casa',
      'team.3since': '4 anos na casa',
      'team.4since': '3 anos na casa',
      'team.tagFade'   : 'Degradê',
      'team.tagRazor'  : 'Navalha',
      'team.tagBeard'  : 'Barba',
      'team.tagSocial' : 'Corte Social',
      'team.tagScissor': 'Tesoura',
      'team.tagBrow'   : 'Sobrancelha',
      'team.tagHot'    : 'Hot Towel',
      'team.tagPig'    : 'Pigmentação',
      'team.tagTex'    : 'Texturizado',
      'team.tagProg'   : 'Progressiva',
      'team.tagVis'    : 'Visagismo',

      'gal.tag'         : 'Nosso trabalho',
      'gal.h'           : 'Cada corte,<br><em>uma obra.</em>',
      'gal.filterGroup' : 'Filtrar trabalhos por categoria',
      'gal.f1'          : 'Todos',
      'gal.f2'          : 'Cabelo',
      'gal.f3'          : 'Barba',
      'gal.f4'          : 'Ambiente',
      'gal.f5'          : 'Vídeos',
      'gal.play'        : 'Reproduzir vídeo',
      'gal.tagProcess'  : 'Processo',
      'gal.tagTutorial' : 'Tutorial',
      'gal.i1'          : 'Nossa Barbearia',
      'gal.i1d'         : 'Um espaço pensado para você se sentir em casa.',
      'gal.i2'          : 'Degradê Clássico',
      'gal.i3'          : 'Delineado',
      'gal.i4'          : 'Barba Completa',
      'gal.i5'          : 'Texturizado',
      'gal.i6'          : 'Hot Towel Shave',
      'gal.i7'          : 'Corte Clássico',
      'gal.i8'          : 'Pigmentação Perfeita',
      'gal.live'        : '{n} trabalhos visíveis',
      'gal.liveOne'     : '1 trabalho visível',

      'rev.tag'      : 'O que dizem',
      'rev.h'        : 'Clientes que<br><em>voltam sempre.</em>',
      'rev.total'    : '+8.200 avaliações',
      'rev.s1'       : 'Recomendam',
      'rev.s2'       : 'Clientes',
      'rev.chart'    : 'Satisfação dos clientes',
      'rev.delta'    : '+14% em 90 dias',
      'rev.chartAlt' : 'Gráfico de satisfação dos clientes nos últimos 90 dias, em tendência de alta',
      'rev.sub'      : 'O convite para avaliar só sai depois de o profissional dar o serviço como concluído. Quem não veio, não avalia.',
      'rev.verified' : 'Avaliação verificada pela InBarber',
      'rev.more'     : 'Ver mais avaliações',
      'rev.less'     : 'Ver menos',
      'rev.stars'    : '5 estrelas',
      'rev.stars4'   : '4 estrelas',
      'rev.q1' : 'Melhor barbearia que já fui. Atenção incrível aos detalhes — o barbeiro entendeu exatamente o que eu queria.',
      'rev.q2' : 'Ambiente super aconchegante, atendimento impecável. Já é minha barbearia fixa. Recomendo demais!',
      'rev.q3' : 'Fiz corte + barba e saí completamente diferente. Profissionalismo do início ao fim, sem pressa.',
      'rev.q4' : 'O agendamento online é prático demais. Fácil de usar e sempre tem horário disponível. 10/10.',
      'rev.d1' : 'há 3 dias',
      'rev.d2' : 'há 1 semana',
      'rev.d3' : 'há 2 semanas',
      'rev.d4' : 'há 1 mês',
      'rev.q5' : 'Marquei pelo site num domingo à noite e a confirmação chegou na hora. No sábado estava lá, sem precisar ligar para ninguém.',
      'rev.q6' : 'Levo meu filho de 7 anos e têm paciência de verdade com ele. Saiu de lá orgulhoso do corte.',
      'rev.q7' : 'Corte impecável. Só achei a espera longa no sábado de manhã — mas avisaram assim que atrasou e ainda ofereceram café.',
      'rev.q8' : 'Quinta vez que volto. Pigmentação bem feita, sem exagero, e o preço na saída é o mesmo que apareceu no agendamento.',
      'rev.d5' : 'há 1 mês',
      'rev.d6' : 'há 2 meses',
      'rev.d7' : 'há 2 meses',
      'rev.d8' : 'há 3 meses',

      'loc.tag'      : 'Onde estamos',
      'loc.h'        : 'Como<br><em>chegar.</em>',
      'loc.sub'      : 'A 4 minutos a pé da estação Consolação. Copie o endereço ou abra a rota direto no seu aplicativo de mapas.',
 
      'loc.addr'     : 'Endereço',
      'loc.landmark' : 'Fachada preta com letreiro CORVO em azul, entre a padaria e a banca. Térreo, sem degraus.',
      'loc.route'    : 'Como chegar',
      'loc.copy'     : 'Copiar endereço',
      'loc.copyAria' : 'Copiar o endereço da Corvo Barbearia',
      'loc.copied'   : 'Endereço copiado.',
      'loc.copyFail' : 'Não deu para copiar — o endereço está aqui em cima.',
 
      'loc.openNow'      : 'Aberto agora · fecha às {time}',
      'loc.closingSoon'  : 'Aberto · última hora, fecha às {time}',
      'loc.opensToday'   : 'Fechado · abre hoje às {time}',
      'loc.opensTomorrow': 'Fechado · abre amanhã às {time}',
      'loc.opensDay'     : 'Fechado · abre {day} às {time}',
      'loc.closedNow'    : 'Fechado',
 
      'loc.hours'     : 'Horários',
      'loc.hoursToday': 'Hoje',
      'loc.closedDay' : 'Fechado',
 
      'loc.mapAlt'   : 'Mapa com a Corvo Barbearia e a estação de metrô Consolação',
      'loc.mapPin'   : 'Corvo',
      'loc.mapMetro' : 'Metrô Consolação',
      'loc.interact' : 'Mexer no mapa',
      'loc.mapDone'  : 'Fixar mapa',
      'loc.appsH'    : 'Abrir em outro app',
 
      'loc.callUs'   : 'Ligar',
      'loc.waNow'    : 'Tirar uma dúvida',
      'loc.book'     : 'Agendar horário',
 
      'loc.modesH'   : 'Chegar de',
      'loc.metroH'   : 'Metrô · 4 min a pé',
      'loc.metroTxt' : 'Estação Consolação (Linha 2-Verde), saída Rua Augusta. Suba pelo lado ímpar, 350 m.',
      'loc.carH'     : 'Carro · estacionamento ao lado',
      'loc.carTxt'   : 'Convênio no nº 1188. R$ 15 nas duas primeiras horas com o carimbo da recepção.',
      'loc.walkH'    : 'A pé · pela Augusta',
      'loc.walkTxt'  : 'Entre a Praça Roosevelt e a Rua Luís Coutinho Cavalcanti, no mesmo quarteirão da livraria.',
 
      'loc.fact1'    : 'Entrada sem degraus',
      'loc.fact2'    : 'Aceita cartão e Pix',
      'loc.fact3'    : 'Wi-Fi liberado',
      'loc.fact4'    : 'Sem taxa de sinal',

      'cta.tag' : 'Pronto para o próximo nível?',
      'cta.h'   : 'Seu visual <br>começa <br><em>agora.</em>',
      'cta.sub' : 'Escolha seu horário e deixa o resto com a gente.',
      'cta.btn' : 'Agendar meu horário →',
      'cta.wa'  : 'Falar no WhatsApp',
      'cta.proof': 'Quem já sentou na cadeira',
      'cta.p1'  : 'Confirmação na hora, sem telefonema',

      'foot.desc'    : 'Tradição, técnica e estilo. Um espaço onde cada detalhe importa.',
      'foot.navH'    : 'Navegar',
      'foot.visitH'  : 'Visitar',
      'foot.week'    : 'Segunda a sexta',
      'foot.privacy' : 'Privacidade',
      'foot.rights'  : '© 2026 Corvo Barbearia. Todos os direitos reservados.',
      'foot.by'      : 'Agendamento por',

      'book.title'    : 'Seu atendimento',
      'book.clear'    : 'Cancelar tudo',
      'book.clearAria': 'Cancelar todos os serviços',
      'book.total'    : 'Total',
      'book.cta'      : 'Agendar',
      'book.cartAria' : 'Ver serviços selecionados',
      'book.remove'   : 'Remover {name}',
      'book.items'    : '{n} itens',
      'book.item'     : '1 item',
      'book.more'     : '{name} e mais {n}...',
      'book.window'   : 'Se começar {day} às {start}, termina às {end}.',

      /* ─── PRODUTOS ─── */
      'prod.meta_desc'   : 'Pomadas, óleos e produtos de barbearia da Corvo. Reserve online e levante no balcão.',
      'prod.title'       : 'Produtos',
      'prod.back'        : 'Voltar',
      'prod.back_aria'   : 'Voltar para a página principal',
      'prod.tag'         : 'Loja da barbearia',
      'prod.h1'          : 'Leve a barbearia<br><em>para casa.</em>',
      'prod.sub'         : 'Reserve agora e levante no balcão — sem pagamento online, sem prazo de entrega.',
      'prod.filters_aria': 'Filtrar por categoria',
      'prod.cat_all'     : 'Todos',
      'prod.cat_pomadas' : 'Pomadas',
      'prod.cat_cabelo'  : 'Cabelo',
      'prod.cat_barba'   : 'Barba',
      'prod.cat_acessorios': 'Acessórios',
      'prod.available'   : 'disponível',
      'prod.available_pl': 'disponíveis',
      'prod.low_stock'   : 'Últimas unidades',
      'prod.featured'    : 'Destaque',
      'prod.new'         : 'Novo',
      'prod.out'         : 'Esgotado',
      'prod.add'         : 'Reservar',
      'prod.added'       : 'Adicionado',
      'prod.less'        : 'Menos uma unidade',
      'prod.more'        : 'Mais uma unidade',
      'prod.remove'      : 'Remover',
      'prod.unit'        : 'unidade',
      'prod.empty'       : 'Nenhum produto nesta categoria de momento.',
      'prod.cart'        : 'Carrinho',
      'prod.cart_close'  : 'Fechar carrinho',
      'prod.cart_empty'  : 'O carrinho está vazio.',
      'prod.cart_note'   : 'Pagamento no balcão ao levantar.',
      'prod.cart_item'   : 'item no carrinho',
      'prod.cart_items'  : 'itens no carrinho',
      'prod.total'       : 'Total',
      'prod.confirm'     : 'Confirmar reserva',
      'prod.sending'     : 'A reservar…',
      'prod.close'       : 'Fechar',
      'prod.optional'    : '(opcional)',
      'prod.modal_tag'   : 'Quase lá',
      'prod.modal_title' : 'Os seus dados',
      'prod.modal_sub'   : 'Só precisamos do nome e de um contacto para guardar a reserva no balcão.',
      'prod.field_name'  : 'Nome',
      'prod.field_name_ph': 'Como se chama?',
      'prod.field_tel'   : 'Celular',
      'prod.field_obs'   : 'Observações',
      'prod.field_obs_ph': 'Ex.: passo lá na sexta ao final do dia.',
      'prod.err_name'    : 'Indique o seu nome.',
      'prod.err_tel'     : 'Indique um contacto válido.',
      'prod.err_stock'   : 'Já não há unidades suficientes de {nome}.',
      'prod.err_generic' : 'Não foi possível concluir a reserva. Tente novamente.',
      'prod.err_load'    : 'Não foi possível carregar os produtos.',

      'nav.products'     : 'Produtos',
      'prod.land_h'      : 'O ritual continua<br>em <em>casa.</em>',
      'prod.land_sub'    : 'Os mesmos produtos que usamos no atendimento. Reserve online e pague no balcão quando vier levantar.',
      'prod.land_all'    : 'Ver todos os produtos',
      'prod.land_note'   : 'Sem pagamento online — reserva agora, paga no balcão.',

      'prod.save'        : 'poupa {valor}',
      'prod.each'        : 'cada',
      'prod.piece'       : 'peça',
      'prod.pieces'      : 'peças',
      'prod.subtotal'    : 'Subtotal',
      'prod.discount'    : 'Desconto',
      'prod.continue'    : 'Continuar',
      'prod.step1'       : 'Dados',
      'prod.step2'       : 'Revisão',
      'prod.tel_hint'    : 'Escolha o país e escreva o número. Usamos só para avisar quando o produto estiver separado.',
      'prod.err_name_short' : 'O nome está demasiado curto.',
      'prod.err_tel_short'  : 'Número incompleto para o país escolhido.',
      'prod.tel_country' : 'País',
      'prod.tel_search'  : 'Procurar país',
      'prod.tel_nofind'  : 'Nenhum país encontrado.',
      'prod.err_name_digits' : 'O nome não pode ter números.',
      'prod.err_name_chars'  : 'Esse carácter não é válido num nome.',

      'prod.rev_tag'     : 'Última confirmação',
      'prod.rev_title'   : 'Confira antes de reservar',
      'prod.rev_sub'     : 'Depois disto o stock fica reservado em seu nome até vir levantar.',
      'prod.rev_client'  : 'Reserva em nome de',
      'prod.rev_edit'    : 'Editar',
      'prod.back_fix'    : 'Voltar e corrigir',

      'prod.step_title'  : 'Adicionar produtos',
      'prod.step_sub'    : 'Quer levar algum produto da barbearia?',
      'prod.step_skip'   : 'Continuar sem produtos',

      'prod.res_title'   : 'Reserva recebida!',
      'prod.res_sub'     : 'Os seus produtos ficam à sua espera no balcão.',
      'prod.res_num'     : 'Número de reserva',
      'prod.res_items'   : 'Produtos reservados',
      'prod.res_obs'     : 'A sua observação',
      'prod.pickup_title': 'Como levantar o seu produto',
      'prod.pickup_1'    : 'Dirija-se à barbearia dentro do horário de funcionamento.',
      'prod.pickup_2'    : 'Apresente o número da reserva ao balcão.',
      'prod.pickup_3'    : 'Pagamento no momento da retirada — sem horário fixo, venha quando quiser.',
      'prod.hours_title' : 'Horário de funcionamento',
      'prod.map'         : 'Ver no mapa',
      'prod.wa'          : 'Falar no WhatsApp',
      'prod.new_res'     : 'Reservar mais produtos',
      'prod.home'        : 'Voltar ao início',

      'crm.prod_tab'      : 'Produtos',
      'crm.prod_pending'  : 'Pendentes',
      'crm.prod_confirmed': 'Confirmadas',
      'crm.prod_released' : 'Libertadas',
      'crm.prod_deliver'  : 'Marcar entregue',
      'crm.prod_release'  : 'Libertar reserva',
      'crm.prod_linked'   : 'Vinculado a agendamento',

      'wa.message' : 'Olá, queria marcar um horário na Corvo',

      'day.0':'domingo','day.1':'segunda','day.2':'terça','day.3':'quarta',
      'day.4':'quinta','day.5':'sexta','day.6':'sábado'
    },

    /* ───────────────────────────── ENGLISH ───────────────────────────── */
    en: {
      'meta.title'   : 'Corvo Barbershop — Barbershop in Consolação, São Paulo',
      'meta.desc'    : 'Haircuts, beard work and the full hot-towel ritual on Rua Augusta. Book online in seconds — pick your barber and your time.',
      'meta.ogTitle' : 'Corvo Barbershop — book your cut in seconds',
      'meta.locale'  : 'en_US',
      'html.lang'    : 'en',

      'a11y.skip'        : 'Skip to content',
      'a11y.scroll'      : 'See more',
      'a11y.motionPause' : 'Pause animations',
      'a11y.motionPlay'  : 'Resume animations',

      'nav.about'    : 'About',
      'nav.services' : 'Services',
      'nav.team'     : 'Team',
      'nav.gallery'  : 'Gallery',
      'nav.location' : 'Location',
      'nav.cta'      : 'Book now',
      'nav.profile'  : 'Profile',
      'nav.menu'     : 'Menu',

      'drawer.title'       : 'Menu',
      'drawer.close'       : 'Close menu',
      'drawer.book'        : 'Book an appointment',
      'drawer.book_sub'    : 'Pick service, barber and time',
      'drawer.profile'     : 'Profile',
      'drawer.profile_sub' : 'Manage your account',
      'drawer.language'    : 'Language',
      'drawer.langGroup'   : 'Select language',
      'lang.label'         : 'English',

      'tick.1': 'Classic Cut',
      'tick.2': 'Full Beard',
      'tick.3': 'Fade',
      'tick.4': 'Beard Filling',
      'tick.5': 'Hot Towel Shave',
      'tick.6': 'Eyebrows',
      'tick.7': 'Keratin',

      'hero.eyebrow' : 'Since 2013 · Craft &amp; Tradition',
      'hero.h1'      : 'Where every<br>detail<br><em>counts.</em>',
      'hero.desc'    : 'Precise cuts. A room worth sitting in.<br>The experience you deserve.',
      'hero.cta1'    : 'Book a time',
      'hero.cta2'    : 'Take a look',
      'hero.stat1'   : 'Years',
      'hero.stat2'   : 'Clients',
      'hero.stat3'   : 'Rating',

      'slots.label'  : 'Next open times',
      'slots.all'    : 'See full calendar →',
      'slots.today'  : 'Today',
      'slots.tomorrow': 'Tomorrow',
      'slots.aria'   : 'Book {day} at {time}',
      'slots.closed' : 'Closed right now — see the calendar',

      'about.tag'   : 'Our story',
      'about.h'     : 'A tradition<br>of <em>excellence.</em>',
      'about.ph'    : 'Photo of the shop',
      'about.badge' : 'Satisfaction',
      'about.body'  : 'We started with one simple aim: bring back the ritual of looking after yourself. Every cut is a piece of work — sharp technique, real attention to detail, and a room that feels like your own.',
      'about.p1h'   : 'Flawless technique',
      'about.p1b'   : 'Certified barbers with years behind both classic and modern cuts.',
      'about.p2h'   : 'A room of your own',
      'about.p2b'   : 'A space built for you to unwind while we handle the rest.',
      'about.p3h'   : 'Premium products',
      'about.p3b'   : 'Only selected brands, for the best result on beard and hair.',

      'svc.tag'   : 'What we do',
      'svc.h'     : 'Build your<br><em>appointment.</em>',
      'svc.hint'  : 'Tap the services you want and watch the total add up.',
      'svc.1badge': 'Most booked',
      'svc.1save' : 'save R$ 6',
      'svc.1name' : 'Cut + Beard',
      'svc.1desc' : 'The full combo: wash, cut, straight-razor beard and finish.',
      'svc.2name' : 'Classic Cut',
      'svc.2desc' : 'Classic cut with scissors and clippers, flawless finish.',
      'svc.3name' : 'Classic Beard',
      'svc.3desc' : 'Beard shaped with a straight razor, hot towel and conditioning.',
      'svc.4name' : 'Fade',
      'svc.4desc' : 'A clean fade from skin to the length you want, no lines.',
      'svc.5name' : 'Beard Filling',
      'svc.5desc' : 'Fills the gaps and evens out the colour of your beard.',
      'svc.6name' : 'Hot Towel Shave',
      'svc.6desc' : 'The full ritual: hot towel, lather and straight razor.',
      'svc.7name' : 'Eyebrows',
      'svc.7desc' : 'Shaping and definition with thread, tweezers or razor.',
      'svc.term1' : 'No prepayment',
      'svc.term2' : 'Cancel up to 2h before, free',
      'svc.term3' : 'No account needed to book',

      'team.tag'   : 'Our team',
      'team.h'     : 'Meet the people behind<br>your <em>look.</em>',
      'team.sub'   : 'Passionate professionals. Click to get to know each one better.',
      'team.cta'   : 'Book with',
      'team.avHint'      : 'view profile',
      'team.statCuts'    : 'Cuts',
      'team.statClients' : 'Clients',
      'team.statYears'   : 'Years',
      'team.modalSpecialties': 'Specialties',
      'team.modalLangs'  : 'Languages',
      'team.modalPortfolio': 'Portfolio',
      'team.1role' : 'Fades and straight razor',
      'team.2role' : 'Classics and scissor work',
      'team.3role' : 'Beards and the hot ritual',
      'team.4role' : 'Texture and face shaping',
      'team.1bio'  : 'Fade master and texture specialist. Focused on personalised service and contemporary techniques.',
      'team.2bio'  : 'Classic cut and scissor specialist. Six years of dedication with flawless attention to detail.',
      'team.3bio'  : 'Dedicated to the art of the beard and hot rituals. Four years turning every visit into a relaxation experience.',
      'team.4bio'  : 'Texture and face-shaping specialist. Three years creating cuts that complement every face shape.',
      'team.1since': '9 years here',
      'team.2since': '6 years here',
      'team.3since': '4 years here',
      'team.4since': '3 years here',
      'team.tagFade'   : 'Fade',
      'team.tagRazor'  : 'Straight razor',
      'team.tagBeard'  : 'Beard',
      'team.tagSocial' : 'Classic Cut',
      'team.tagScissor': 'Scissors',
      'team.tagBrow'   : 'Eyebrows',
      'team.tagHot'    : 'Hot Towel',
      'team.tagPig'    : 'Beard Filling',
      'team.tagTex'    : 'Texture',
      'team.tagProg'   : 'Keratin',
      'team.tagVis'    : 'Face shaping',

      'gal.tag'         : 'Our work',
      'gal.h'           : 'Every cut,<br><em>a piece of work.</em>',
      'gal.filterGroup' : 'Filter work by category',
      'gal.f1'          : 'All',
      'gal.f2'          : 'Hair',
      'gal.f3'          : 'Beard',
      'gal.f4'          : 'The shop',
      'gal.f5'          : 'Videos',
      'gal.play'        : 'Play video',
      'gal.tagProcess'  : 'Process',
      'gal.tagTutorial' : 'Tutorial',
      'gal.i1'          : 'Our shop',
      'gal.i1d'         : 'A space built to feel like your own.',
      'gal.i2'          : 'Classic Fade',
      'gal.i3'          : 'Beard Line-up',
      'gal.i4'          : 'Full Beard',
      'gal.i5'          : 'Textured Cut',
      'gal.i6'          : 'Hot Towel Shave',
      'gal.i7'          : 'Classic Cut',
      'gal.i8'          : 'Perfect Filling',
      'gal.live'        : '{n} pieces showing',
      'gal.liveOne'     : '1 piece showing',

      'rev.tag'      : 'What they say',
      'rev.h'        : 'Clients who<br><em>keep coming back.</em>',
      'rev.total'    : '8,200+ reviews',
      'rev.s1'       : 'Recommend us',
      'rev.s2'       : 'Clients',
      'rev.chart'    : 'Client satisfaction',
      'rev.delta'    : '+14% over 90 days',
      'rev.chartAlt' : 'Chart of client satisfaction over the last 90 days, trending up',
      'rev.sub'      : 'The invitation to review only goes out once the barber marks the service as finished. No visit, no review.',
      'rev.verified' : 'Review verified by InBarber',
      'rev.more'     : 'See more reviews',
      'rev.less'     : 'See fewer',
      'rev.stars'    : '5 stars',
      'rev.stars4'   : '4 stars',
      'rev.q1' : 'Best barbershop I have been to. Incredible attention to detail — he understood exactly what I wanted.',
      'rev.q2' : 'Really welcoming room, flawless service. It is my regular shop now. Highly recommend.',
      'rev.q3' : 'Got the cut and beard and walked out a different person. Professional from start to finish, never rushed.',
      'rev.q4' : 'Booking online is so easy. Simple to use and there is always a slot open. 10/10.',
      'rev.d1' : '3 days ago',
      'rev.d2' : '1 week ago',
      'rev.d3' : '2 weeks ago',
      'rev.d4' : '1 month ago',
      'rev.q5' : 'Booked on the site on a Sunday night and the confirmation landed straight away. Saturday I was in the chair, no phone call needed.',
      'rev.q6' : 'I bring my 7-year-old and they have real patience with him. He walked out proud of his cut.',
      'rev.q7' : 'Flawless cut. The wait on Saturday morning was long — but they told me as soon as they were running late, and put a coffee in my hand.',
      'rev.q8' : 'Fifth time back. Pigmentation done well, never overdone, and the price at the door is the price I saw when booking.',
      'rev.d5' : '1 month ago',
      'rev.d6' : '2 months ago',
      'rev.d7' : '2 months ago',
      'rev.d8' : '3 months ago',

'loc.tag'      : 'Find us',
      'loc.h'        : 'Getting<br><em>here.</em>',
      'loc.sub'      : 'A 4-minute walk from Consolação metro station. Copy the address or open the route straight in your maps app.',
 
      'loc.addr'     : 'Address',
      'loc.landmark' : 'Black storefront with the CORVO sign in blue, between the bakery and the newsstand. Ground floor, step-free.',
      'loc.route'    : 'Get directions',
      'loc.copy'     : 'Copy address',
      'loc.copyAria' : 'Copy the address of Corvo Barbershop',
      'loc.copied'   : 'Address copied.',
      'loc.copyFail' : "Couldn't copy — the address is right above.",
 
      'loc.openNow'      : 'Open now · closes at {time}',
      'loc.closingSoon'  : 'Open · last hour, closes at {time}',
      'loc.opensToday'   : 'Closed · opens today at {time}',
      'loc.opensTomorrow': 'Closed · opens tomorrow at {time}',
      'loc.opensDay'     : 'Closed · opens {day} at {time}',
      'loc.closedNow'    : 'Closed',
 
      'loc.hours'     : 'Opening hours',
      'loc.hoursToday': 'Today',
      'loc.closedDay' : 'Closed',
 
      'loc.mapAlt'   : 'Map showing Corvo Barbershop and Consolação metro station',
      'loc.mapPin'   : 'Corvo',
      'loc.mapMetro' : 'Consolação station',
      'loc.interact' : 'Move the map',
      'loc.mapDone'  : 'Lock the map',
      'loc.appsH'    : 'Open in another app',
 
      'loc.callUs'   : 'Call',
      'loc.waNow'    : 'Ask us anything',
      'loc.book'     : 'Book a time',
 
      'loc.modesH'   : 'Getting here by',
      'loc.metroH'   : 'Metro · 4 min walk',
      'loc.metroTxt' : 'Consolação station (Line 2-Green), Rua Augusta exit. Head uphill on the odd-numbered side, 350 m.',
      'loc.carH'     : 'Car · parking next door',
      'loc.carTxt'   : 'Partner garage at no. 1188. R$15 for the first two hours with a stamp from reception.',
      'loc.walkH'    : 'On foot · along Augusta',
      'loc.walkTxt'  : 'Between Praça Roosevelt and Rua Luís Coutinho Cavalcanti, same block as the bookshop.',
 
      'loc.fact1'    : 'Step-free entrance',
      'loc.fact2'    : 'Card and Pix accepted',
      'loc.fact3'    : 'Free Wi-Fi',
      'loc.fact4'    : 'No deposit required',

      'cta.tag' : 'Ready for the next level?',
      'cta.h'   : 'Your look <br>starts <br><em>now.</em>',
      'cta.sub' : 'Pick your time and leave the rest to us.',
      'cta.btn' : 'Book my time →',
      'cta.wa'  : 'Message on WhatsApp',
      'cta.proof': 'From people who sat in the chair',
      'cta.p1'  : 'Instant confirmation, no phone call',

      'foot.desc'    : 'Tradition, technique and style. A place where every detail counts.',
      'foot.navH'    : 'Browse',
      'foot.visitH'  : 'Visit',
      'foot.week'    : 'Monday to Friday',
      'foot.privacy' : 'Privacy',
      'foot.rights'  : '© 2026 Corvo Barbershop. All rights reserved.',
      'foot.by'      : 'Booking by',

      'book.title'    : 'Your appointment',
      'book.clear'    : 'Clear all',
      'book.clearAria': 'Clear all services',
      'book.total'    : 'Total',
      'book.cta'      : 'Book',
      'book.cartAria' : 'See selected services',
      'book.remove'   : 'Remove {name}',
      'book.items'    : '{n} items',
      'book.item'     : '1 item',
      'book.more'     : '{name} and {n} more...',
      'book.window'   : 'Starting {day} at {start}, you are out by {end}.',

      /* ─── PRODUCTS ─── */
      'prod.meta_desc'   : 'Pomades, oils and grooming products from Corvo. Reserve online and pick up at the counter.',
      'prod.title'       : 'Products',
      'prod.back'        : 'Back',
      'prod.back_aria'   : 'Back to the main page',
      'prod.tag'         : 'The shop counter',
      'prod.h1'          : 'Take the barbershop<br><em>home with you.</em>',
      'prod.sub'         : 'Reserve now, pick it up at the counter — no online payment, no shipping wait.',
      'prod.filters_aria': 'Filter by category',
      'prod.cat_all'     : 'All',
      'prod.cat_pomadas' : 'Pomades',
      'prod.cat_cabelo'  : 'Hair',
      'prod.cat_barba'   : 'Beard',
      'prod.cat_acessorios': 'Accessories',
      'prod.available'   : 'left',
      'prod.available_pl': 'left',
      'prod.low_stock'   : 'Last units',
      'prod.featured'    : 'Featured',
      'prod.new'         : 'New',
      'prod.out'         : 'Sold out',
      'prod.add'         : 'Reserve',
      'prod.added'       : 'Added',
      'prod.less'        : 'One less',
      'prod.more'        : 'One more',
      'prod.remove'      : 'Remove',
      'prod.unit'        : 'each',
      'prod.empty'       : 'Nothing in this category right now.',
      'prod.cart'        : 'Cart',
      'prod.cart_close'  : 'Close cart',
      'prod.cart_empty'  : 'Your cart is empty.',
      'prod.cart_note'   : 'Pay at the counter when you pick up.',
      'prod.cart_item'   : 'item in cart',
      'prod.cart_items'  : 'items in cart',
      'prod.total'       : 'Total',
      'prod.confirm'     : 'Confirm reservation',
      'prod.sending'     : 'Reserving…',
      'prod.close'       : 'Close',
      'prod.optional'    : '(optional)',
      'prod.modal_tag'   : 'Almost there',
      'prod.modal_title' : 'Your details',
      'prod.modal_sub'   : 'We only need a name and a phone number to hold the order at the counter.',
      'prod.field_name'  : 'Name',
      'prod.field_name_ph': 'What should we call you?',
      'prod.field_tel'   : 'Phone',
      'prod.field_obs'   : 'Notes',
      'prod.field_obs_ph': 'e.g. I will drop by on Friday evening.',
      'prod.err_name'    : 'Please enter your name.',
      'prod.err_tel'     : 'Please enter a valid phone number.',
      'prod.err_stock'   : 'There are no longer enough units of {nome}.',
      'prod.err_generic' : 'We could not complete the reservation. Please try again.',
      'prod.err_load'    : 'We could not load the products.',

      'nav.products'     : 'Products',
      'prod.land_h'      : 'The ritual carries on<br><em>at home.</em>',
      'prod.land_sub'    : 'The same products we use on you here. Reserve online and pay at the counter when you collect.',
      'prod.land_all'    : 'See all products',
      'prod.land_note'   : 'No online payment — reserve now, pay at the counter.',

      'prod.save'        : 'save {valor}',
      'prod.each'        : 'each',
      'prod.piece'       : 'item',
      'prod.pieces'      : 'items',
      'prod.subtotal'    : 'Subtotal',
      'prod.discount'    : 'Discount',
      'prod.continue'    : 'Continue',
      'prod.step1'       : 'Details',
      'prod.step2'       : 'Review',
      'prod.tel_hint'    : 'Pick the country and type the number. Only used to tell you the order is ready.',
      'prod.err_name_short' : 'That name is too short.',
      'prod.err_tel_short'  : 'Number is incomplete for the country you picked.',
      'prod.tel_country' : 'Country',
      'prod.tel_search'  : 'Search country',
      'prod.tel_nofind'  : 'No country found.',
      'prod.err_name_digits' : 'A name cannot contain numbers.',
      'prod.err_name_chars'  : 'That character is not valid in a name.',

      'prod.rev_tag'     : 'One last check',
      'prod.rev_title'   : 'Check before reserving',
      'prod.rev_sub'     : 'After this the stock is held in your name until you collect it.',
      'prod.rev_client'  : 'Reserved for',
      'prod.rev_edit'    : 'Edit',
      'prod.back_fix'    : 'Back and fix',

      'prod.step_title'  : 'Add products',
      'prod.step_sub'    : 'Want to take anything home from the shop?',
      'prod.step_skip'   : 'Continue without products',

      'prod.res_title'   : 'Reservation received!',
      'prod.res_sub'     : 'Your products are waiting for you at the counter.',
      'prod.res_num'     : 'Reservation number',
      'prod.res_items'   : 'Reserved products',
      'prod.res_obs'     : 'Your note',
      'prod.pickup_title': 'How to pick up your order',
      'prod.pickup_1'    : 'Drop by the barbershop during opening hours.',
      'prod.pickup_2'    : 'Show your reservation number at the counter.',
      'prod.pickup_3'    : 'Pay when you collect — no fixed time, come whenever suits you.',
      'prod.hours_title' : 'Opening hours',
      'prod.map'         : 'View on the map',
      'prod.wa'          : 'Message on WhatsApp',
      'prod.new_res'     : 'Reserve more products',
      'prod.home'        : 'Back to home',

      'crm.prod_tab'      : 'Products',
      'crm.prod_pending'  : 'Pending',
      'crm.prod_confirmed': 'Confirmed',
      'crm.prod_released' : 'Released',
      'crm.prod_deliver'  : 'Mark delivered',
      'crm.prod_release'  : 'Release reservation',
      'crm.prod_linked'   : 'Linked to an appointment',

      'wa.message' : 'Hi, I would like to book a time at Corvo',

      'day.0':'Sunday','day.1':'Monday','day.2':'Tuesday','day.3':'Wednesday',
      'day.4':'Thursday','day.5':'Friday','day.6':'Saturday'
    },

    /* ───────────────────────────── ESPAÑOL ───────────────────────────── */
    es: {
      'meta.title'   : 'Corvo Barbería — Barbería en Consolação, São Paulo',
      'meta.desc'    : 'Corte, barba y ritual completo en la Rua Augusta. Reserva online en segundos: elige barbero y horario.',
      'meta.ogTitle' : 'Corvo Barbería — reserva tu corte en segundos',
      'meta.locale'  : 'es_ES',
      'html.lang'    : 'es',

      'a11y.skip'        : 'Saltar al contenido',
      'a11y.scroll'      : 'Ver más',
      'a11y.motionPause' : 'Pausar animaciones',
      'a11y.motionPlay'  : 'Reanudar animaciones',

      'nav.about'    : 'Nosotros',
      'nav.services' : 'Servicios',
      'nav.team'     : 'Equipo',
      'nav.gallery'  : 'Galería',
      'nav.location' : 'Ubicación',
      'nav.cta'      : 'Reservar',
      'nav.profile'  : 'Perfil',
      'nav.menu'     : 'Menú',

      'drawer.title'       : 'Menú',
      'drawer.close'       : 'Cerrar menú',
      'drawer.book'        : 'Reservar hora',
      'drawer.book_sub'    : 'Elige servicio, barbero y hora',
      'drawer.profile'     : 'Perfil',
      'drawer.profile_sub' : 'Gestionar tu cuenta',
      'drawer.language'    : 'Idioma',
      'drawer.langGroup'   : 'Seleccionar idioma',
      'lang.label'         : 'Español',

      'tick.1': 'Corte Clásico',
      'tick.2': 'Barba Completa',
      'tick.3': 'Degradado',
      'tick.4': 'Pigmentación',
      'tick.5': 'Afeitado con Toalla',
      'tick.6': 'Cejas',
      'tick.7': 'Alisado',

      'hero.eyebrow' : 'Desde 2013 · Arte &amp; Tradición',
      'hero.h1'      : 'Donde cada<br>detalle<br><em>importa.</em>',
      'hero.desc'    : 'Cortes precisos. Ambiente exclusivo.<br>La experiencia que mereces.',
      'hero.cta1'    : 'Reservar hora',
      'hero.cta2'    : 'Conocer',
      'hero.stat1'   : 'Años',
      'hero.stat2'   : 'Clientes',
      'hero.stat3'   : 'Valoración',

      'slots.label'  : 'Próximos horarios libres',
      'slots.all'    : 'Ver agenda completa →',
      'slots.today'  : 'Hoy',
      'slots.tomorrow': 'Mañana',
      'slots.aria'   : 'Reservar {day} a las {time}',
      'slots.closed' : 'Cerrado ahora — mira la agenda',

      'about.tag'   : 'Nuestra historia',
      'about.h'     : 'Una tradición<br>de <em>excelencia.</em>',
      'about.ph'    : 'Foto del local',
      'about.badge' : 'Satisfacción',
      'about.body'  : 'Nacimos con una misión sencilla: recuperar el ritual del cuidado masculino. Cada corte es una obra — técnica afinada, atención al detalle y un ambiente que se siente como casa.',
      'about.p1h'   : 'Técnica impecable',
      'about.p1b'   : 'Barberos certificados con años de experiencia en cortes clásicos y modernos.',
      'about.p2h'   : 'Ambiente exclusivo',
      'about.p2b'   : 'Un espacio pensado para relajarte mientras cuidamos de tu imagen.',
      'about.p3h'   : 'Productos premium',
      'about.p3b'   : 'Solo marcas seleccionadas, para el mejor resultado en barba y cabello.',

      'svc.tag'   : 'Lo que ofrecemos',
      'svc.h'     : 'Arma tu<br><em>servicio.</em>',
      'svc.hint'  : 'Toca los servicios que quieras y mira el total al momento.',
      'svc.1badge': 'Más pedido',
      'svc.1save' : 'ahorra R$ 6',
      'svc.1name' : 'Corte + Barba',
      'svc.1desc' : 'Combo completo con lavado, corte, barba a navaja y acabado.',
      'svc.2name' : 'Corte Clásico',
      'svc.2desc' : 'Corte clásico con tijera y máquina, acabado impecable.',
      'svc.3name' : 'Barba Clásica',
      'svc.3desc' : 'Barba perfilada a navaja, con toalla caliente e hidratación.',
      'svc.4name' : 'Degradado',
      'svc.4desc' : 'Degradado perfecto desde cero al largo que quieras, sin marcas.',
      'svc.5name' : 'Pigmentación',
      'svc.5desc' : 'Cubre los huecos y uniforma el color de la barba.',
      'svc.6name' : 'Afeitado con Toalla',
      'svc.6desc' : 'Ritual completo con toalla caliente, espuma y navaja recta.',
      'svc.7name' : 'Cejas',
      'svc.7desc' : 'Diseño y definición con hilo, pinza o navaja.',
      'svc.term1' : 'Sin pago por adelantado',
      'svc.term2' : 'Cancela hasta 2h antes, sin coste',
      'svc.term3' : 'No hace falta cuenta para reservar',

      'team.tag'   : 'Nuestro equipo',
      'team.h'     : 'Conoce a quienes cuidan<br>tu <em>imagen.</em>',
      'team.sub'   : 'Profesionales apasionados por lo que hacen. Haz clic para conocer mejor a cada uno.',
      'team.cta'   : 'Reservar con',
      'team.avHint'      : 'ver perfil',
      'team.statCuts'    : 'Cortes',
      'team.statClients' : 'Clientes',
      'team.statYears'   : 'Años',
      'team.modalSpecialties': 'Especialidades',
      'team.modalLangs'  : 'Idiomas',
      'team.modalPortfolio': 'Portafolio',
      'team.1role' : 'Degradados y navaja',
      'team.2role' : 'Clásicos y tijera',
      'team.3role' : 'Barba y ritual caliente',
      'team.4role' : 'Texturizados y visagismo',
      'team.1bio'  : 'Maestro del fade y especialista en texturas. Enfocado en atención personalizada y técnicas contemporáneas.',
      'team.2bio'  : 'Especialista en cortes clásicos y tijera. Seis años de dedicación con atención impecable al detalle.',
      'team.3bio'  : 'Dedicado al arte de la barba y los rituales calientes. Cuatro años transformando cada visita en relajación.',
      'team.4bio'  : 'Especialista en texturizados y visagismo. Tres años creando cortes que valorizan cada rostro.',
      'team.1since': '9 años en la casa',
      'team.2since': '6 años en la casa',
      'team.3since': '4 años en la casa',
      'team.4since': '3 años en la casa',
      'team.tagFade'   : 'Degradado',
      'team.tagRazor'  : 'Navaja',
      'team.tagBeard'  : 'Barba',
      'team.tagSocial' : 'Corte Clásico',
      'team.tagScissor': 'Tijera',
      'team.tagBrow'   : 'Cejas',
      'team.tagHot'    : 'Toalla Caliente',
      'team.tagPig'    : 'Pigmentación',
      'team.tagTex'    : 'Texturizado',
      'team.tagProg'   : 'Alisado',
      'team.tagVis'    : 'Visagismo',

      'gal.tag'         : 'Nuestro trabajo',
      'gal.h'           : 'Cada corte,<br><em>una obra.</em>',
      'gal.filterGroup' : 'Filtrar trabajos por categoría',
      'gal.f1'          : 'Todos',
      'gal.f2'          : 'Cabello',
      'gal.f3'          : 'Barba',
      'gal.f4'          : 'Local',
      'gal.f5'          : 'Vídeos',
      'gal.play'        : 'Reproducir vídeo',
      'gal.tagProcess'  : 'Proceso',
      'gal.tagTutorial' : 'Tutorial',
      'gal.i1'          : 'Nuestra Barbería',
      'gal.i1d'         : 'Un espacio pensado para que te sientas en casa.',
      'gal.i2'          : 'Degradado Clásico',
      'gal.i3'          : 'Perfilado',
      'gal.i4'          : 'Barba Completa',
      'gal.i5'          : 'Texturizado',
      'gal.i6'          : 'Afeitado con Toalla',
      'gal.i7'          : 'Corte Clásico',
      'gal.i8'          : 'Pigmentación Perfecta',
      'gal.live'        : '{n} trabajos visibles',
      'gal.liveOne'     : '1 trabajo visible',

      'rev.tag'      : 'Lo que dicen',
      'rev.h'        : 'Clientes que<br><em>siempre vuelven.</em>',
      'rev.total'    : '+8.200 valoraciones',
      'rev.s1'       : 'Nos recomiendan',
      'rev.s2'       : 'Clientes',
      'rev.chart'    : 'Satisfacción de clientes',
      'rev.delta'    : '+14% en 90 días',
      'rev.chartAlt' : 'Gráfico de satisfacción de clientes en los últimos 90 días, en tendencia al alza',
      'rev.sub'      : 'La invitación para valorar solo sale cuando el profesional marca el servicio como terminado. Quien no vino, no valora.',
      'rev.verified' : 'Valoración verificada por InBarber',
      'rev.more'     : 'Ver más valoraciones',
      'rev.less'     : 'Ver menos',
      'rev.stars'    : '5 estrellas',
      'rev.stars4'   : '4 estrellas',
      'rev.q1' : 'La mejor barbería en la que he estado. Atención al detalle increíble — entendió exactamente lo que quería.',
      'rev.q2' : 'Ambiente muy acogedor, atención impecable. Ya es mi barbería fija. La recomiendo mucho.',
      'rev.q3' : 'Me hice corte y barba y salí completamente distinto. Profesionalidad de principio a fin, sin prisas.',
      'rev.q4' : 'Reservar online es comodísimo. Fácil de usar y siempre hay hueco. 10/10.',
      'rev.d1' : 'hace 3 días',
      'rev.d2' : 'hace 1 semana',
      'rev.d3' : 'hace 2 semanas',
      'rev.d4' : 'hace 1 mes',
      'rev.q5' : 'Reservé por la web un domingo por la noche y la confirmación llegó al momento. El sábado estaba allí, sin llamar a nadie.',
      'rev.q6' : 'Llevo a mi hijo de 7 años y tienen paciencia de verdad con él. Salió orgulloso del corte.',
      'rev.q7' : 'Corte impecable. La espera del sábado por la mañana se hizo larga — pero avisaron en cuanto se retrasaron y me ofrecieron un café.',
      'rev.q8' : 'Quinta vez que vuelvo. Pigmentación bien hecha, sin excesos, y el precio al salir es el mismo que salía al reservar.',
      'rev.d5' : 'hace 1 mes',
      'rev.d6' : 'hace 2 meses',
      'rev.d7' : 'hace 2 meses',
      'rev.d8' : 'hace 3 meses',

      'loc.tag'      : 'Dónde estamos',
      'loc.h'        : 'Cómo<br><em>llegar.</em>',
      'loc.sub'      : 'A 4 minutos a pie de la estación Consolação. Copia la dirección o abre la ruta directamente en tu app de mapas.',
 
      'loc.addr'     : 'Dirección',
      'loc.landmark' : 'Fachada negra con el letrero CORVO en azul, entre la panadería y el quiosco. Planta baja, sin escalones.',
      'loc.route'    : 'Cómo llegar',
      'loc.copy'     : 'Copiar dirección',
      'loc.copyAria' : 'Copiar la dirección de Corvo Barbería',
      'loc.copied'   : 'Dirección copiada.',
      'loc.copyFail' : 'No se pudo copiar — la dirección está aquí arriba.',
 
      'loc.openNow'      : 'Abierto ahora · cierra a las {time}',
      'loc.closingSoon'  : 'Abierto · última hora, cierra a las {time}',
      'loc.opensToday'   : 'Cerrado · abre hoy a las {time}',
      'loc.opensTomorrow': 'Cerrado · abre mañana a las {time}',
      'loc.opensDay'     : 'Cerrado · abre el {day} a las {time}',
      'loc.closedNow'    : 'Cerrado',
 
      'loc.hours'     : 'Horarios',
      'loc.hoursToday': 'Hoy',
      'loc.closedDay' : 'Cerrado',
 
      'loc.mapAlt'   : 'Mapa con Corvo Barbería y la estación de metro Consolação',
      'loc.mapPin'   : 'Corvo',
      'loc.mapMetro' : 'Metro Consolação',
      'loc.interact' : 'Mover el mapa',
      'loc.mapDone'  : 'Fijar el mapa',
      'loc.appsH'    : 'Abrir en otra app',
 
      'loc.callUs'   : 'Llamar',
      'loc.waNow'    : 'Resolver una duda',
      'loc.book'     : 'Reservar hora',
 
      'loc.modesH'   : 'Llegar en',
      'loc.metroH'   : 'Metro · 4 min a pie',
      'loc.metroTxt' : 'Estación Consolação (Línea 2-Verde), salida Rua Augusta. Sube por el lado impar, 350 m.',
      'loc.carH'     : 'Coche · aparcamiento al lado',
      'loc.carTxt'   : 'Convenio en el nº 1188. R$ 15 las dos primeras horas con el sello de recepción.',
      'loc.walkH'    : 'A pie · por la Augusta',
      'loc.walkTxt'  : 'Entre la Praça Roosevelt y la Rua Luís Coutinho Cavalcanti, en la manzana de la librería.',
 
      'loc.fact1'    : 'Entrada sin escalones',
      'loc.fact2'    : 'Acepta tarjeta y Pix',
      'loc.fact3'    : 'Wi-Fi gratis',
      'loc.fact4'    : 'Sin señal previa',

      'cta.tag' : '¿Listo para el siguiente nivel?',
      'cta.h'   : 'Tu imagen <br>empieza <br><em>ahora.</em>',
      'cta.sub' : 'Elige tu horario y deja el resto con nosotros.',
      'cta.btn' : 'Reservar mi hora →',
      'cta.wa'  : 'Hablar por WhatsApp',
      'cta.proof': 'Quien ya se sentó en la silla',
      'cta.p1'  : 'Confirmación al instante, sin llamadas',

      'foot.desc'    : 'Tradición, técnica y estilo. Un espacio donde cada detalle importa.',
      'foot.navH'    : 'Navegar',
      'foot.visitH'  : 'Visitar',
      'foot.week'    : 'De lunes a viernes',
      'foot.privacy' : 'Privacidad',
      'foot.rights'  : '© 2026 Corvo Barbería. Todos los derechos reservados.',
      'foot.by'      : 'Reservas con',

      'book.title'    : 'Tu servicio',
      'book.clear'    : 'Cancelar todo',
      'book.clearAria': 'Cancelar todos los servicios',
      'book.total'    : 'Total',
      'book.cta'      : 'Reservar',
      'book.cartAria' : 'Ver servicios seleccionados',
      'book.remove'   : 'Quitar {name}',
      'book.items'    : '{n} artículos',
      'book.item'     : '1 artículo',
      'book.more'     : '{name} y {n} más...',
      'book.window'   : 'Si empiezas {day} a las {start}, terminas a las {end}.',

      /* ─── PRODUCTOS ─── */
      'prod.meta_desc'   : 'Pomadas, aceites y productos de barbería de Corvo. Reserva online y recoge en el mostrador.',
      'prod.title'       : 'Productos',
      'prod.back'        : 'Volver',
      'prod.back_aria'   : 'Volver a la página principal',
      'prod.tag'         : 'La tienda de la barbería',
      'prod.h1'          : 'Llévate la barbería<br><em>a casa.</em>',
      'prod.sub'         : 'Reserva ahora y recoge en el mostrador — sin pago online, sin esperas de envío.',
      'prod.filters_aria': 'Filtrar por categoría',
      'prod.cat_all'     : 'Todos',
      'prod.cat_pomadas' : 'Pomadas',
      'prod.cat_cabelo'  : 'Cabello',
      'prod.cat_barba'   : 'Barba',
      'prod.cat_acessorios': 'Accesorios',
      'prod.available'   : 'disponible',
      'prod.available_pl': 'disponibles',
      'prod.low_stock'   : 'Últimas unidades',
      'prod.featured'    : 'Destacado',
      'prod.new'         : 'Nuevo',
      'prod.out'         : 'Agotado',
      'prod.add'         : 'Reservar',
      'prod.added'       : 'Añadido',
      'prod.less'        : 'Una unidad menos',
      'prod.more'        : 'Una unidad más',
      'prod.remove'      : 'Quitar',
      'prod.unit'        : 'unidad',
      'prod.empty'       : 'No hay productos en esta categoría por ahora.',
      'prod.cart'        : 'Carrito',
      'prod.cart_close'  : 'Cerrar carrito',
      'prod.cart_empty'  : 'El carrito está vacío.',
      'prod.cart_note'   : 'Pago en el mostrador al recoger.',
      'prod.cart_item'   : 'artículo en el carrito',
      'prod.cart_items'  : 'artículos en el carrito',
      'prod.total'       : 'Total',
      'prod.confirm'     : 'Confirmar reserva',
      'prod.sending'     : 'Reservando…',
      'prod.close'       : 'Cerrar',
      'prod.optional'    : '(opcional)',
      'prod.modal_tag'   : 'Ya casi',
      'prod.modal_title' : 'Tus datos',
      'prod.modal_sub'   : 'Solo necesitamos un nombre y un teléfono para guardar la reserva en el mostrador.',
      'prod.field_name'  : 'Nombre',
      'prod.field_name_ph': '¿Cómo te llamas?',
      'prod.field_tel'   : 'Teléfono',
      'prod.field_obs'   : 'Observaciones',
      'prod.field_obs_ph': 'Ej.: paso el viernes por la tarde.',
      'prod.err_name'    : 'Indica tu nombre.',
      'prod.err_tel'     : 'Indica un teléfono válido.',
      'prod.err_stock'   : 'Ya no quedan suficientes unidades de {nome}.',
      'prod.err_generic' : 'No se pudo completar la reserva. Inténtalo de nuevo.',
      'prod.err_load'    : 'No se pudieron cargar los productos.',

      'nav.products'     : 'Productos',
      'prod.land_h'      : 'El ritual sigue<br>en <em>casa.</em>',
      'prod.land_sub'    : 'Los mismos productos que usamos contigo aquí. Reserva online y paga en el mostrador al recoger.',
      'prod.land_all'    : 'Ver todos los productos',
      'prod.land_note'   : 'Sin pago online — reserva ahora, paga en el mostrador.',

      'prod.save'        : 'ahorras {valor}',
      'prod.each'        : 'c/u',
      'prod.piece'       : 'artículo',
      'prod.pieces'      : 'artículos',
      'prod.subtotal'    : 'Subtotal',
      'prod.discount'    : 'Descuento',
      'prod.continue'    : 'Continuar',
      'prod.step1'       : 'Datos',
      'prod.step2'       : 'Revisión',
      'prod.tel_hint'    : 'Elige el país y escribe el número. Solo lo usamos para avisarte cuando esté listo.',
      'prod.err_name_short' : 'El nombre es demasiado corto.',
      'prod.err_tel_short'  : 'Número incompleto para el país elegido.',
      'prod.tel_country' : 'País',
      'prod.tel_search'  : 'Buscar país',
      'prod.tel_nofind'  : 'No se encontró ningún país.',
      'prod.err_name_digits' : 'El nombre no puede llevar números.',
      'prod.err_name_chars'  : 'Ese carácter no es válido en un nombre.',

      'prod.rev_tag'     : 'Última confirmación',
      'prod.rev_title'   : 'Revisa antes de reservar',
      'prod.rev_sub'     : 'A partir de aquí el stock queda reservado a tu nombre hasta que lo recojas.',
      'prod.rev_client'  : 'Reserva a nombre de',
      'prod.rev_edit'    : 'Editar',
      'prod.back_fix'    : 'Volver y corregir',

      'prod.step_title'  : 'Añadir productos',
      'prod.step_sub'    : '¿Quieres llevarte algún producto de la barbería?',
      'prod.step_skip'   : 'Continuar sin productos',

      'prod.res_title'   : '¡Reserva recibida!',
      'prod.res_sub'     : 'Tus productos te esperan en el mostrador.',
      'prod.res_num'     : 'Número de reserva',
      'prod.res_items'   : 'Productos reservados',
      'prod.res_obs'     : 'Tu observación',
      'prod.pickup_title': 'Cómo recoger tu pedido',
      'prod.pickup_1'    : 'Acércate a la barbería dentro del horario de apertura.',
      'prod.pickup_2'    : 'Muestra el número de reserva en el mostrador.',
      'prod.pickup_3'    : 'Pago al recoger — sin horario fijo, ven cuando quieras.',
      'prod.hours_title' : 'Horario de apertura',
      'prod.map'         : 'Ver en el mapa',
      'prod.wa'          : 'Hablar por WhatsApp',
      'prod.new_res'     : 'Reservar más productos',
      'prod.home'        : 'Volver al inicio',

      'crm.prod_tab'      : 'Productos',
      'crm.prod_pending'  : 'Pendientes',
      'crm.prod_confirmed': 'Confirmadas',
      'crm.prod_released' : 'Liberadas',
      'crm.prod_deliver'  : 'Marcar entregado',
      'crm.prod_release'  : 'Liberar reserva',
      'crm.prod_linked'   : 'Vinculado a una cita',

      'wa.message' : 'Hola, quería reservar una hora en Corvo',

      'day.0':'domingo','day.1':'lunes','day.2':'martes','day.3':'miércoles',
      'day.4':'jueves','day.5':'viernes','day.6':'sábado'
    }
  };

  var STORAGE_KEY = 'corvo.lang';
  var SUPPORTED   = ['pt', 'en', 'es'];

  /* Ordem de decisão: ?lang= na URL › escolha guardada › português.

     O idioma do browser NÃO entra aqui de propósito. O Googlebot
     rasteja com Accept-Language: en-US — se a página se traduzisse
     sozinha, o URL canónico pt-BR acabaria indexado em inglês. As
     versões traduzidas têm o seu próprio URL (?lang=en) e estão
     declaradas em <link rel="alternate" hreflang>.

     Para ativar deteção automática, descomentar o bloco abaixo. */
  function pickInitial() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) > -1) return q;

    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) > -1) return saved;
    } catch (_) {}

    // var nav = (navigator.language || 'pt').slice(0, 2).toLowerCase();
    // if (SUPPORTED.indexOf(nav) > -1) return nav;

    return 'pt';
  }

  var current = pickInitial();

  function t(key, vars) {
    var table = DICT[current] || DICT.pt;
    var str = table[key];
    if (str === undefined) str = DICT.pt[key];
    if (str === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.split('{' + k + '}').join(vars[k]);
      });
    }
    return str;
  }

  /* Decodifica entidades (&amp;) para uso em textContent */
  var decoder = document.createElement('textarea');
  function decode(str) {
    if (str.indexOf('&') === -1) return str;
    decoder.innerHTML = str;
    return decoder.value;
  }

  function apply(lang, remember) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'pt';
    current = lang;

    if (remember !== false) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    }

    document.documentElement.lang = t('html.lang');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = decode(t(el.dataset.i18n));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', decode(t(el.dataset.i18nAria)));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', decode(t(el.dataset.i18nPlaceholder)));
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      el.setAttribute('alt', decode(t(el.dataset.i18nAlt)));
    });
    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
      el.setAttribute('content', decode(t(el.dataset.i18nContent)));
    });

    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', t('meta.locale'));

    var label = document.querySelector('.lang-current-label');
    if (label) label.textContent = t('lang.label');

    document.querySelectorAll('.lang-pill').forEach(function (p) {
      var active = p.dataset.lang === lang;
      p.classList.toggle('active', active);
      p.setAttribute('aria-pressed', String(active));
    });

    /* Links de WhatsApp: a mensagem pré-preenchida segue o idioma */
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      a.href = a.href.split('?')[0] + '?text=' + encodeURIComponent(t('wa.message'));
    });

    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
  }

  window.I18N = {
    t: t,
    apply: apply,
    supported: SUPPORTED,
    get lang() { return current; }
  };

  function boot() {
    /* O boot não grava: só uma escolha explícita nas pills fica
       guardada. Assim ?lang=en partilhado por alguém não muda o
       idioma preferido de quem abre o link. */
    apply(current, false);
    document.querySelectorAll('.lang-pill').forEach(function (pill) {
      pill.addEventListener('click', function () { apply(pill.dataset.lang, true); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();