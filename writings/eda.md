---
title: "Three envelopes"
date: 2026-07-21
summary: "Three firms own three quarters of chip-design software. Washington put it under license by letter in May 2025 and handed it back forty days later."
tags: [semiconductors, chokepoints, export-controls]
pinned: false
announce: false
---

On Friday, May 23, 2025, the Bureau of Industry and Security sent Cadence Design Systems (CDNS) a letter. Siemens EDA got one the same day, and the following Thursday Synopsys (SNPS) received its copy and suspended its guidance within hours. A license was now required to export, re-export or transfer within China any electronic design automation software, including software classed so low on the control list that it normally needed no license at all. The day the news leaked, Cadence fell 10.7 percent and Synopsys 9.6. Three envelopes, and most of the world's chip design was under license.

Three was enough because three is basically the whole industry. Synopsys has about 31 percent of global EDA revenue, Cadence about 30, Siemens about 13, which is three quarters of the market and roughly 80 percent of China's. Siemens' Calibre, which checks a layout against a foundry's rules before tape-out, is used by nine in ten chip designers on earth. A chip is a drawing before it's a thing, and the drawing gets made in software owned by two Californian companies and a division of a German conglomerate.

I write Rust for a living, so the way I see this is as the difference between a check at compile time and a check at runtime. Chip controls are runtime checks. A rule names a part number, customs inspects each shipment, and smugglers test the coverage one crate at a time. Controlling the design tools is a compile-time check. Nothing unpermitted gets built, because it never gets drawn. That's what the letters did, and it's why the industry went so quiet. Nobody was told what was still permissible, so the three companies stopped almost everything.

In practice there was a hole, and it's worth being honest about it. Software already installed on a Chinese desk kept running. What stopped was updates, patches and support. The compiler stayed, frozen at its last version, and a frozen compiler designs yesterday's chip forever. That bites hardest at the frontier, where every new node needs new tool releases, and barely at all on the mature nodes where China ships most of its volume. A license on software is a slow strangulation rather than a cut.

It lasted forty days. On July 2 Synopsys got a second letter saying the restrictions were rescinded, effective immediately. Cadence and Siemens followed a day later. The price was rare earths. Under the framework agreed with Beijing, China would speed up its permits for magnets and critical minerals, and America would let chip-design software, ethane and aircraft engines flow again. So the most complete chokepoint in American technology got spent on a truce over dysprosium. China's hold on rare earths is a chemical process that takes a decade to copy. America's is software, and last summer the two were put on one table and swapped.

The money explains some of it. Synopsys took about $990 million from China in fiscal 2024, 16 percent of its revenue, and Cadence $550 million, 12 percent. Empyrean, the largest Chinese vendor, took about 1.2 billion yuan that year, roughly $170 million, and has sat on the Entity List since December 2024; Primarius and a hundred-odd smaller firms share the rest. Synopsys's China sales alone are nearly six times Empyrean's whole business, and every month under the letters sent Chinese purchase orders to Empyrean instead, which is how a chokepoint ends up funding its own replacement. Synopsys, meanwhile, closed its $35 billion purchase of Ansys in July 2025 and now sells the physics as well as the logic: heat, stress and electromagnetics under the same roof as timing. This year's fight has moved downstream, to lithography tools and who is allowed to service them in China.

If I were going to bet on this, I'd bet on the three rather than on the chips. A chip gets sanctioned by name, one part number at a time. The software it was drawn in has no part number and, at the frontier, no substitute, and the one time Washington picked it up as a weapon, it put it down again after forty days.

Sources:
- [Kirkland & Ellis, BIS takes aim at Chinese semiconductor industry with novel export controls approach (June 2025)](https://www.kirkland.com/publications/kirkland-alert/2025/06/bis-takes-aim-at-chinese-semiconductor)
- [Tom's Hardware, White House lifts chip design export ban on China in exchange for rare earth compromise (July 3, 2025)](https://www.tomshardware.com/tech-industry/semiconductors/white-house-lifts-chip-design-export-ban-on-china-in-exchange-for-rare-earth-materials-compromise-export-licences-for-eda-software-sales-no-longer-required)
- [TrendForce, China revenue at risk as US curbs slam EDA giants (June 2, 2025)](https://www.trendforce.com/news/2025/06/02/news-china-revenue-at-risk-as-u-s-curbs-slam-eda-giants-impact-on-synopsys-cadence-and-more/)
- [EE Times, US restricts EDA software sales to China (May 30, 2025)](https://www.eetimes.com/u-s-restricts-eda-software-sales-to-china/)
- [Bits&Chips, Iran war deadlock gave ASML reprieve from US China crackdown (August 21, 2026)](https://bits-chips.com/article/iran-war-deadlock-gave-asml-reprieve-from-us-china-crackdown/)
