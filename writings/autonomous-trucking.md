---
title: "A truck with no driver still needs a dispatcher"
date: 2026-09-23
summary: "Driverless trucks are late, real and about to get cheap. I think the money ends up with whoever has the loads, so I own Uber, not Aurora."
tags: [autonomy, freight, Uber, investing]
pinned: false
announce: false
---

Aurora (AUR) put out its third-quarter letter on October 28 and the number that jumped out at me was twenty. That's how many driverless trucks it has built. In February the target was two hundred by the end of the year, and that has quietly become the end of next February. Revenue guidance went from a $15 million midpoint to $9 million, the quarter brought in $3 million against a $234 million net loss, and a company valued at close to $10 billion dropped 7 percent after hours. Kodiak (KDK), down 87 percent since it listed last year, signed its first binding highway contract around the same time: seventy-five trucks for a carrier in Fresno, starting in 2028. Tesla's Semi finally reached volume production in September, seven years late, and it isn't autonomous.

I don't want to be unfair to Aurora. Its trucks have run half a million commercial miles with nobody on board, including the thousand-mile run from Fort Worth to Phoenix that no human is legally allowed to drive without stopping. It's promising a thousand trucks by the end of 2027, and one carrier has signed up for five hundred of them, non-binding. The $250 million it expects to burn this quarter is the binding part.

A figure I kept hearing this year, 1,300 percent growth to 2036, turns out not to be Goldman's at all. It's a research shop's forecast of a $1.3 billion market last year becoming $17.7 billion. Goldman's actual April note is more useful to me: a $560 billion global market by 2035, cost parity with a human driver in the US around 2028, and a cost per mile falling from $8.56 today to $2.03, against a driver at $2.55 now and $2.84 then. If a truck runs 80 cents a mile cheaper than a person and never hits an hours-of-service limit, it doesn't have to be clever. It just has to be legal.

What the forecast skips, I think, is what the business looks like once the driver is software. The truck becomes a commodity that Volvo and Paccar build on their existing lines, and the driver becomes a per-mile licence sold by two or three vendors who can't really hold a price against each other. Aurora and Kodiak both describe themselves as asset-light, meaning the carrier buys the truck and rents the driver by the mile. Fine, but then where does the money go? To whoever has the loads. Matching freight to trucks across a continent is a demand problem, and there's one company that has spent sixteen years on nothing else.

I own Uber (UBER). The market has decided it's a ride-hailing company about to be eaten by robotaxis. It closed at $65.78 on October 27, a 52-week low, 35 percent below its high, at fourteen times trailing earnings, having just produced $10 billion of trailing free cash flow for the first time. Bookings grew 24 percent last quarter. Waymo did leave Uber's app in Phoenix in July and plans its own in Austin and Atlanta in 2028, but it runs about 4,000 cars. Uber did 3.9 billion trips in a quarter, and under half a percent of them were autonomous. So the disruption is real and it's small, and the stock is priced as if it were large and certain.

The freight side is the part nobody seems to model. Uber Freight manages more than $20 billion of freight. Aurora, Volvo's autonomous unit and Waabi have all hauled its loads between Dallas and Houston. Uber owns a piece of Aurora from selling it its own self-driving unit back in 2020, and it backed Waabi's funding round. It builds no truck and writes no driver. The way I'd put it in Rust is that Uber is a trait: the caller never learns which concrete type is behind it, only that the method is implemented. The market is pricing the trait as if it were one of the implementations.

The counter-argument is a serious one and I go back and forth on it. A demand layer only has power while supply is fragmented. If Waymo ends up with most of the robotaxis and two companies end up with most of the trucks, they'll sell direct and Uber's take rate becomes a toll the owners won't pay. The founder of Uber Freight left last year to run operations at Waabi, which tells you something about where he thinks the power sits.

My bet is still the other way, mostly because every autonomy company I look at is turning into a thin-margin seller of software by the mile, and none of them has a customer. A truck with no driver still needs somebody to tell it where to go, and I'd rather own that somebody than the truck.

Sources:
- [Aurora Innovation, third quarter 2026 shareholder letter (Form 8-K, October 28, 2026)](https://www.sec.gov/Archives/edgar/data/0001828108/000182810826000092/aurora26q3shareholderlet.htm)
- [Goldman Sachs Research, Robotaxis are forecast to become a $400 billion market in 2035 (April 30, 2026)](https://www.goldmansachs.com/insights/articles/robotaxis-to-become-a-400-billion-dollar-market-in-2035)
- [TechCrunch, Uber is building an autonomous vehicle empire: every company it's using (August 1, 2026)](https://techcrunch.com/2026/08/01/ubers-autonomous-vehicle-deal-tracker/)
- [TIKR, Uber stock is down 28% and the robotaxi clock is ticking (September 24, 2026)](https://www.tikr.com/blog/uber-stock-is-down-28-and-the-robotaxi-clock-is-ticking-its-ceo-just-bought-10-million-of-stock-anyway)
- [Electrek, Tesla Semi finally enters volume production, 7 years behind schedule (September 25, 2026)](https://electrek.co/2026/09/25/tesla-semi-volume-production-launch-nevada-factory/)
