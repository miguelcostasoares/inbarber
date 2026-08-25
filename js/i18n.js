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
      'loc.h'        : 'Venha nos<br><em>visitar.</em>',
      'loc.sub'      : 'Na Rua Augusta, a dois minutos do metro Consolação. Uma experiência premium começa pelo ambiente.',
      'loc.addr'     : 'Endereço',
      'loc.hours'    : 'Horários',
      'loc.hoursVal' : 'Seg–Sex: 9h–20h<br>Sáb: 8h–18h<br>Dom: encerrado',
      'loc.contact'  : 'Contato',
      'loc.wa'       : 'WhatsApp disponível',
      'loc.mapAlt'   : 'Mapa mostrando a localização da Corvo Barbearia em São Paulo',
      'loc.interact' : 'Interagir',
      'loc.close'    : 'Fechar',
      'loc.book'     : 'Agendar horário',
      'loc.route'    : 'Traçar rota →',

      'cta.tag' : 'Pronto para o próximo nível?',
      'cta.h'   : 'Seu visual<br>começa<br><em>agora.</em>',
      'cta.sub' : 'Escolha seu horário e deixa o resto com a gente.',
      'cta.btn' : 'Agendar meu horário →',
      'cta.wa'  : 'Falar no WhatsApp',

      'foot.desc'    : 'Tradição, técnica e estilo. Um espaço onde cada detalhe importa.',
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

      'loc.tag'      : 'Where we are',
      'loc.h'        : 'Come<br><em>visit us.</em>',
      'loc.sub'      : 'On Rua Augusta, two minutes from Consolação metro. A premium experience starts with the room.',
      'loc.addr'     : 'Address',
      'loc.hours'    : 'Hours',
      'loc.hoursVal' : 'Mon–Fri: 9am–8pm<br>Sat: 8am–6pm<br>Sun: closed',
      'loc.contact'  : 'Contact',
      'loc.wa'       : 'WhatsApp available',
      'loc.mapAlt'   : 'Map showing Corvo Barbershop in São Paulo',
      'loc.interact' : 'Interact',
      'loc.close'    : 'Close',
      'loc.book'     : 'Book a time',
      'loc.route'    : 'Get directions →',

      'cta.tag' : 'Ready for the next level?',
      'cta.h'   : 'Your look<br>starts<br><em>now.</em>',
      'cta.sub' : 'Pick your time and leave the rest to us.',
      'cta.btn' : 'Book my time →',
      'cta.wa'  : 'Message on WhatsApp',

      'foot.desc'    : 'Tradition, technique and style. A place where every detail counts.',
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
      'loc.h'        : 'Ven a<br><em>visitarnos.</em>',
      'loc.sub'      : 'En la Rua Augusta, a dos minutos del metro Consolação. Una experiencia premium empieza por el ambiente.',
      'loc.addr'     : 'Dirección',
      'loc.hours'    : 'Horarios',
      'loc.hoursVal' : 'Lun–Vie: 9h–20h<br>Sáb: 8h–18h<br>Dom: cerrado',
      'loc.contact'  : 'Contacto',
      'loc.wa'       : 'WhatsApp disponible',
      'loc.mapAlt'   : 'Mapa mostrando la ubicación de Corvo Barbería en São Paulo',
      'loc.interact' : 'Interactuar',
      'loc.close'    : 'Cerrar',
      'loc.book'     : 'Reservar hora',
      'loc.route'    : 'Cómo llegar →',

      'cta.tag' : '¿Listo para el siguiente nivel?',
      'cta.h'   : 'Tu imagen<br>empieza<br><em>ahora.</em>',
      'cta.sub' : 'Elige tu horario y deja el resto con nosotros.',
      'cta.btn' : 'Reservar mi hora →',
      'cta.wa'  : 'Hablar por WhatsApp',

      'foot.desc'    : 'Tradición, técnica y estilo. Un espacio donde cada detalle importa.',
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