# Ramesh review of the NaaS guided storefront

Date: 2026-09-09
Source: Voice memo "1222 Commerce St 21.m4a", 25:43, transcribed locally with whisper-large-v3-turbo. Recording starts mid-meeting.
Present (from the audio): Ramesh, Dave, Santosh, Micah.

---

Governance, what actions do I want you to take there? What can I show you? Same on cost as well, right?
So if we keep it to the connectivity part, the performance and the reliability part, the cost and the security and governance,
I feel at least in terms of broad buckets, we will help them, we will not push them at least towards something, right?
Yeah.
And the key is for us to be able to kind of translate this all into what we have discovered.
So that's why the workload discovery part is extremely important because then you're not showing kind of this IP and whatnot,
but actually using resource identifiers, names, tags, and so forth.
So, and our value or core value is you should not be able to just use this on a single cloud,
you should be able to use this on multiple clouds and across the entirety of the network as well.
So that's kind of what we need to be able to show.
So Ramesh, just to kind of repeat then, we start here, we start with this kind of view.
Well, let's ask the question.
That was kind of my thinking, but Dave Sandosh, is this where we want the eyes to land first?
Yeah.
And I'm just thinking bigger picture and smaller because we can have all kinds of customers, right?
Like I've worked with customers only got two clouds connection in four regions and they have like five branch offices, right?
So it's really simple, but when you think about like, for example, Wells Fargo kind of scalable enterprise,
there will be pretty, it will be complex to show representation like this.
So I think we have to be creative on what-
I think we can use some grouping logic there.
I see this.
Yeah.
I would say they, I think we can use grouping logic, but at least in terms of structure,
should we keep this to left side is kind of sides, users, whatever that is.
Middle section is what is going through the AT&T fabric.
Yeah.
And then there should also be things that are going outside of the AT&T fabric, right?
So not everything is going through the AT&T fabric or something that going outside of that.
It could be your second vendor.
It could be internet, whatnot.
And then where is it going to?
Right.
I think that's good idea.
So Bucket, I think, Micah, you have at least done pretty good illustration here, which, you know, can actually,
and we can put actual customer here.
I can give you some access and maybe draw that so we can see how it will look like.
But I think when I land, I see there's a landing page, right?
So I land here as a user and I see already pretty fantastic summary view of my network, right?
That, okay, this is what my network looks like.
Some with AT&T, some with somebody else.
Third party, you can just tag as a third party because we don't know if it's,
if we can even tell Lumen or something else, it'll be nicer.
But we can, let's say, do something like that.
But it's not the, it's not that they are here for, right?
I can see what I have.
They already probably know what they have.
Like most of the time I talk to at least architects and engineers, they already know, like they already have something,
you know, they can describe and explain to us.
But I think what they are here for is some unknown thing they might don't see every day, right?
So I see, let's say, some links here has performance issues or some links are overutilized.
Some links are costing them $1,000 or more versus maybe, you know, some logic will show if you were to use AT&T Cloud Fabric,
then you would probably save 10% or something which I'm here for is like,
hey, I see this.
I can gain this if I were to change, make some changes in different buckets that performance, cost and security, right?
The security more of a, I did audit for you and then I see that, you know, some of the things are not aligned to, you know,
your compliancy in the cloud environment because cloud has its own security governance.
So, so I'm thinking as a landing page, I'm presenting them the baseline and value AT&T can upgrade, right?
So I think you already have some of that, Micah, as well through this one today.
If you don't go up a little bit.
Yeah, Micah, the other thing I would say is I think this is good for kind of concept brainstorming,
but in terms of like what should go into the, into the product, I would say we start with less
and then I think we can add as we, as we develop, right?
So I think the starting points to me are kind of one, this is this, this page and then we should have like one observe section
similar to what we just went through with the AI fabric.
So you have a bunch of things that we haven't been able to see as, as a result.
And then we have, and then we have like a govern section, right?
Where you are now able to put some policies, put some,
the address controls and so on and so forth.
I would say maybe we stick to, at least as a starting point, we keep to kind of those three, those three sections.
Yeah. So we start here just to kind of clarify in my head.
You said four.
We go from here, we go to observe, or we go to govern, or we go to cop.
Yeah. So if it is, if it's a customer that's not using this already, I think they would go to connect first.
Connect.
Unless they are already an existing customer that we have connected and so forth.
So connect would be one.
And then obviously we want to, we want to push them towards observe as much as possible.
Because once they are able to observe what we are able to show, then from there, we can take them to govern and policies and so on and so forth.
So that's the flywheel that we start.
To me, the starting point of that flywheel is the observe section.
Yeah, I love it.
So step one, there's, there's four steps for new customers.
New customers start at step one.
Customers, other customers start at step two.
So makes sense.
Makes sense to the lifecycle.
Yes.
Okay.
So that's what I've written down in the PRDs.
Like if you are brand new, then of course you, you discover a bus because you, you know, you're just landing here.
And there are methods for discovery outlined.
And then let's say if you're existing customer, which you're already using some of the connectivity, right?
Could be through the net bond, advance or net bond.
It could be with the TAL solutions we have.
Could be with whatever, right?
But right now we have basic understanding because we don't have full integration, but who can represent this for existing?
And then I think observation perspective, what we observe from all these things, right?
And then we say, okay, if you want to apply some control, then you go under governance and control.
And on the observability part, Dave, I don't know if the newer NBA product you guys were working on has some things already.
I'm just trying to see if you guys have, then we should kind of bring those things as starting points.
Yeah, we have utilizations for all this link.
We are seeing here, for example, we have the up, like, is it up or down link, right?
So there's a red, that means there's some issue there, the BGP layer, you know, basic packet drops kind of information.
Do you want to show it, Dev?
Do you want to show it or Ramesh, do you want to see it or not?
If we have it handy, if we have it handy, we can, then we can quickly make this actionable, right?
So for Micah, this will be, hey, bring these things in and kind of, I think it can make it quite real.
Yeah.
Yeah.
Let me log into the NetBond portal.
Then go under manage, I'll share my screen.
I'll monitor.
If you see any link is actually, these are all internal connections, so I'm going to share my screen.
If any of those link has any utilization, if not, at least you will see idea there at least.
Yeah.
Let me share.
So in this monitoring section, we have, basically, you have the link, right?
So you go by, all these cloud connections are in dropdown, we have by hours, you know, by months, auto refresh and stuff.
So under that, you have performance summary, like what's the link utilized, current, average, bandwidth, in and out.
The utilization, bandwidth, in and out, okay.
And then from there.
Yeah.
Then you can actually.
So this is at the network level, right?
So this is at the network level.
Yes.
Yes.
Okay.
This is the network level.
All the logs, the reports are all network levels.
Yeah.
I think the part that would be helpful, Mika, is as a result of us seeing this at the network level, what workloads slash applications slash resources that we have discovered, which ones of those are impacted, right?
And then you're able to immediately tell them, this is what we are observing.
Okay.
So in other words, we're going to look at the equivalent, the layer equivalent of AT&T NetBond Advance's monitor utilization.
So we're looking at the same structure, but we're looking at a different layer.
Is that what you would want to see?
Yes.
Okay.
We want to be able to show both layers.
So unlike the AI fabric where the network, we want this to be as transparent as possible.
Here, the network is the main product.
So we want to show what we are able to see in the network.
So if there are, let's say bandwidth utilization at that cloud connectivity level, right?
What does that look like?
Or what does the reliability of that look like?
But then translate that also into, okay, you had five connections of which one is experiencing
this problem.
As a result of that, what is impacted?
Here are the workloads that are impacted.
These workloads are also talking to these other workloads.
Those things are impacted.
So I think if we're able to correlate that, that would be super helpful.
Okay.
So in, yeah, so I think there'll be two options, right?
So when we have, we, when we have full private link into the customer environment at VNet or
VPC level, we can say directly impacted workloads because those actually cloud connectivity into
those VNet, we will have full visibility and we'll say, okay, this connection provides
access to all VNet.
So if you don't have, if your link is down, that means you have access down here.
Unless you have fully resilient connection, that means you might have other connections,
right?
So again, you need to think about if architecture has full resilient connectivity, then one may,
one link may have impact.
Doesn't mean the access is gone, right?
To the network.
But if it is, the whole thing is down there.
For less of a whole data center is down and they have connectivity only from the data center,
then you don't have access to your applications.
So that's one thing.
If it is net on, if it is where customer brings their own direct connector or express route,
then we will have only visibility up to their gateways, right?
And so we generally can say that you might have impact in, in this accounts, right?
Within, let's say, AWS account ID, we know which account ID or which subscription ID with
the Azure that we can present that information to the customer.
So I think that's, that's the way to do it.
Now application layers, when we have it, that'd be ideal because that's where customer
would look for is, okay, my application layer seven has some issues and, you know, I cannot
figure this out.
I think when we have, I think we can do when we have the policies and tags and we can then
leverage some of that information to provide insight, that would be valuable.
That will come later, I think.
So in other words, in other words, observe, just tactically speaking, when I click on observe,
that's what you want to see Ramesh.
You want to see that extra, you want to see that, that layer under the button observe.
Okay.
We are observing at the network level, but we are correlating that to what it means for
the customer.
Yes.
That's the, that's the value of the insight that we, that we provide.
Okay.
And that like, you know, some parts, which was like from the Wells Fargo
calls and all, right?
Like, which was interesting is like, we see that they have bought a certain, it of certain
level and their, their utilization is very high.
So basically we kind of go and correlate like, you know, what we are observing in terms of
utilization to what they have actually purchased.
And then deriving insight saying that we recommend you upgrade or whatever it is, right?
Like that kind of thing.
On an network side, Sintosh you're saying on access?
Yeah.
Yeah.
Yeah.
Right.
Okay.
I don't know if that is, that is also possible on the, on the cloud connect side.
Yeah.
Because it seems like it's a similar problem.
Like they will probably buy some bandwidth, right?
From us and things like those.
Cloud side is easier because we already know, right?
On access side, we need to like, we need to pull data.
So on a cloud side, if you look at the products, ADIs or business fiber internet, right?
AIA business here.
They have their own observability kind of information.
Like, okay, if I have internet services, let's say one gig, what is that one gig utilized
so far, right?
Like is it peak hours?
When is it?
How is it utilized?
It changes over the time, over the day.
That information, I don't think we have in this phase.
So the version, I think we have four clouds, right?
That's what I think, Damesh, what you're saying is, when I, my cloud connectivity is not performing
a lot down, like in this case, it's a mustard yellow here, right?
And this flow, that means in a southeast one region, I have some 52 workloads.
And let's say, if I know which workload then is impacted, most probably because this link
is bouncing or this is a word utilized.
That's what I think we can present on the right side.
Yeah.
That's a phase one.
Phase two would be if we get full view on the left side, right?
Which I think Santoshi might have some.
Then we can say, hey, if you have ADI or let's say this ABPN, VPN, external VRFs are connected
to this southeast one, if you have attached that VPN to that, if the VPN utilization of
the interface, you know, because they also have bandwidth, right, for those interfaces,
is overly utilized and you could potentially have a user experiencing some delays to access
some workload in southeast one.
That we can provide some, some ideas once we have those kind of information on the access
side.
I see.
Okay.
Santosh, how do we, how are we envisioning adding what you have already built into this,
any ideas there?
Because I feel like that is quite useful and we've shown that to a few customers and they
love it, right?
So, yeah.
Like see on the left hand side, we have like the left hand side pretty much fully on our end,
right?
Like what we don't have is wireless and stuff, but we do have just the, the MPL is
VPN is probably the AVPN and, and you know, ADI is probably the business.
But the level with which you are able to show versus what is being shown here, I would
say this is like hardly doing any service, right?
And so I'm just trying to see how do we, so we start off maybe here, but then how do we
get to the view that you were able to show?
I think that's what, I think, Maika, you had that, right?
Yeah, I have it.
I just didn't include it in this.
So, so basically what I did Ramesh is I, I made all these cards.
I started at region instead of sites.
And then you can basically click and it basically, oh, like a set of cards, it opens up the next
level.
And you could go all the way down to ATM level by just clicking on, clicking on these boxes.
So yeah, it doesn't take you away because what, what, what, what basically, yeah, what
Santosh told me was very good, which was, listen, he, you're connected to this ATM, this
fabric.
If I click down all the way to ATM, I don't want to lose the context here because I'm
still may want to see, I got to the ATM on 8th street that I care about.
Now I want to see where it's connected.
So I think the context of what, what Santosh is doing is very important.
And I'm just taking all the context, visual context together.
So I'll put that back in for the next, our next iteration.
I think that that would be, that that would be helpful.
And then I know over the weekend, Dave, you sent a mock portal based on, based on kind
of your PRD plus a bunch of things, right?
Yeah.
And especially the insights part in there, I found interesting.
I don't know, Micah, if you have integrated some of those things or?
No, no, pull it up.
Pull your mock portal up.
I don't think I've, I've had a chance to really review it.
Yeah.
Let me see if I can find it now.
I got to.
Is it, is it your lovable that you sent me?
No, no.
I think it was before that I was just playing around with, um, let me just go.
I think I put it in a chat, I believe, uh, in one of the chat, like we have not too many
chats, but let me see.
Let me just, uh, bring that up to your top.
So, it's in that chat that, uh, I just responded.
Okay.
Uh, right there.
Let me see if I can pull that up.
Yeah, just I think maybe the insight, but we have some user stories for NetOn Advance.
I was trying to copy.
Yeah, exactly.
No, I felt, I felt that was, uh, even without reading the PRD, I felt this was easy to follow.
So, I'm just wondering how we can embed some of these things in there.
Yeah.
Can you show it?
I don't, I don't see anything just yet though.
Okay.
Let me see if this is the right one.
Um, is this?
Uh, uh, did you, which one?
No, not the SharePoint.
Okay.
Let me share.
Yeah, I think that's what, uh, let me see.
You guys can see this.
This is, I think, Micah's one, right?
This is Micah's.
Oh, this is Micah's?
Yeah.
Yeah, yeah, yeah.
This is Micah's.
Is it a different version?
Yeah, yeah.
It's mine.
I've got, it's mine.
It's an earlier, it's a weekend version of mine.
Okay.
I see.
Okay.
Sorry.
No, no.
I felt like some of the representations on the insights were good and, and, uh,
easy to follow.
So for example, um, obviously all the network characteristics were shown, but then immediately
my eyes go to, what does this look like?
Um, through, through the fabric, but more importantly, this part, right?
The insights part was interesting.
Um, and if we are able to then go from here to the logs, um, because this talks about all
the patterns, right?
So in the cloud, we have seen the key question that most folks want to answer is what stays
within the region, what grows across region, what goes across cloud, what goes out to the
internet, what's coming in.
So essentially it's those five patterns, right?
Yeah.
That most of the conversation center around those patterns.
And then in each of those patterns, you have connectivity, security, cost, and so forth.
So I felt like this could start that conversation because here you're talking about top talkers.
Yes.
But you also have destinations, you have egress out, you have cloud to cloud.
Uh, and so it gives me the ability to, to launch off, um, to, to, to various parts of the, of the conversation.
Oh, and you would like to like to like to.
Yeah.
So I would put this in observe.
I'm sorry, go ahead.
Hold on, hold on.
So the, the new destination and shadow, shadow SAS, uh, those two from our data, it'll be very hard.
Uh, these like, you know, what we end up seeing like without the proxy will be just IP addresses.
And then the net flow is like heavily sampled.
So we don't really, we don't really.
Yeah, the application level, it'll be tough, uh, it'll be tough.
But at least for cloud workloads, uh, I think, uh, we should be able to see, right?
Because we are the ones connecting them to the cloud workloads.
Hopefully we are able to see.
It will still be IP addresses, right?
Like how will we know what is like, it is going there.
We know that it is going there, but you know, is it going to api.anthropic.com?
That we will not, never know.
No, yeah, we wouldn't know.
I think we have access to this application layer all the way.
Um, so if you, but if we have IPs, can we kind of map that back from IP to resource name at least and then show the resource name?
Yeah, so that is the exercise.
So basically you remember like early on, we were talking to one of Raj's group like Vijay and all.
What they were doing is they were taking mobility traffic, doing DPI, uh, to figure out what IP addresses map to some like api.anthropic.com and all.
Now that is a, that is a lot of work.
I don't think, yeah, I don't think we can do it for the entire.
No, no, no, I don't think.
Public endpoints, maybe we don't, right?
I think, but for private endpoints, hopefully we can.
Yeah.
Because we are the ones creating that mapping.
Um, so maybe we don't show this for public initially until, until we figure out how to.
Okay.
But for private, we should be able to, right?
Because private, uh, resource gets created in the cloud console.
Uh, if you do a discovery tree, that'll immediately tell you this is a resource name.
This is the, uh, IP that it, it belongs to.
So we should hopefully have that mapping.
That's right.
Okay.
Okay.
You can do that, but I think this, all the SAS application probably won't happen until
in future.
We, we are building the SAS connectivity, I think, where we probably get some ideas with
the VNF insertion.
Then I think we can.
Yeah.
Yeah.
So, so Ramesh, just, if I may, just as a, as your UX consultant, if I may throw in a
suggestion to you, I, I think you're doing an absolutely a mass, masterful job at herding
cats to get something done in, in December.
Something functional.
But I do believe there's value in having two experiences that you show customers where
we are now and where you want to go or where I think there's value there.
Yeah.
No, absolutely.
So I think, yeah, the demo environment, honestly, is exactly that.
Okay.
Where we are able to show the, show pieces of those things working today.
And then some of it is mock data to show the, the art of the possible.
Okay.
So, but yeah.
In, in this product again.
So just to, just to summarize.
So we start off with the top level view that you showed.
Uh, the left part will explode based on kind of, Santosh, what you showed.
Uh, the right part will explode based on the discovery tree.
Um, so, so this is not a point in time thing.
We are able to kind of do a double click, double click from there.
Um, from the lens of, so we want, we want to have like four launch of points to either
connect, observe, govern, and cost.
Right.
So those are kind of the four areas that we want to specifically push the customer towards.
In the background, we want to make sure that the areas we cover are all the patterns, right?
Which is to the cloud, cloud to, uh, internet, cloud to cloud, um, egress out, all of, all
of, all of those things.
So if we are able to show that and then show the mapping from network to what, what the workloads
are, uh, and able to kind of translate, um, uh, translate IPs into, into the source names
and so forth, I think that will be a good set of things, uh, initially.
Got it.
Okay.
I can do that.
Uh, real quick tacticals.
Um, uh, Dev, do you mind sending me a screenshot of the monitor screen you had up and Ramesh,
do you mind sending me a screenshot of the screen you liked that you, um, just so that in my notes,
I have everything here recorded just so that in my notes, I can have visual reference.
I can have visual references of what you want.
Sure.
Absolutely.
I think that would be a good starting point.
So we do have the, the retail and transportation cab happening next week.
And then I also have two ABCs, uh, as well, um, with Adidas and, uh, and, uh, a group, uh,
company that I forget right now.
So I think you, yeah, group is another one.
Uh, I think there were three, there were three on Tuesday and then the retail transportation
cab is happening on Wednesday.
So the AI fabric team, uh, will be putting a bunch of these new insights and whatnot together
and bringing that together, together into the demo platform.
Uh, Micah, if we can mock a few of these things up and embed that as well into the demo,
uh, environment, I think that will be a good place to kind of showcase, uh, showcase value together.
Okay.
Well, I'm going to try to get something tomorrow and then get your, your, get this team's approval
tomorrow.
And then on Friday, uh, and then we'll just ask the Israel team to do a straight forward.
Yeah.
This is port.
Yeah.
And since I've got the UI looking like theirs, it should be a much easier port.
Sounds good.
Yeah.
I think that sounds good.
All right.
Thanks.
What's up?
Thank you guys.
Thank you.
This was good.
Thank you.
Bye.
Bye.
