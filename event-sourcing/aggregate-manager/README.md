---
currentMenu: aggregate_manager
---

# Aggregate Manager

The aggregate manager should be used as entry-point for storing and retrieving aggregates.
It uses a repository that will store and read the recorded events in/from an event store,
as well as an identity map to make sure only a single instance of an aggregate is kept in memory.

Before diving into the details of setting up the aggregate manager, let's see how it is actually used.


## Usage and flow

In order to understand how this library deals with storing and retrieving aggregates,
we'll walk through what exactly goes on when we do this.


### Adding an aggregate

We begin with adding our basket to the aggregate manager:

```php
$basket = Basket::pickUp($basketId);
$basket->addProduct($productId);

$aggregateManager->add($basket);
```

The aggregate manager will first check its identity map.
If the basket is not already in there, the aggregate manager will add it.

Then the aggregate manager will add the basket to its repository.

The repository will check if the basket has recorded events.
If not, it simply returns, nothing happens.

In our case we do have events, so the repository will extract and erase them from the basket.

Those events are then wrapped in `EventEnvelope`s.
These envelopes contain extra information like an `EventId`, the name of the event, the version of the aggregate,
a `Timestamp` of when the event took place, and `Metadata`.

Note that the aggregate itself isn't aware of its version.
The repository uses an `EventWrapper` which will keep track of the version.

Also, it initially has no meta data, but meta data can be enriched later on.
This is covered in the [Event Store](/event-sourcing/event-store) section.

So the recorded events are converted (by the event wrapper) into an `EventStream` containing the event envelopes.

And finally that event stream is passed to an event store.


### Getting an aggregate

Again we begin with the aggregate manager:

```php
$basket = $aggregateManager->get($basketId);
```

The aggregate manager will first check its identity map.
If the basket is already in there, it will be returned, nothing further happens.

If it isn't in there, the aggregate manager will consult its repository.

The repository will read an `EventStream` from an event store.
If no events can be found, an exception is thrown.

Otherwise the event stream is converted to `AggregateHistory`.
This means that the envelopes in the event stream are unwrapped, resulting in the original domain events.

The repository then uses a factory to reconstitute the basket from the retrieved history.

And finally we get the reconstituted aggregate.


### Clearing the identity map

If need be, the aggregate manager can be cleared:

```php
$aggregateManager->clear();
```

This basically means that its identity map is cleared. Later added and retrieved aggregates are new objects.


## Setup

Before we can set up the aggregate manager itself, we need to make some other things in order.
We'll start the deepest dependencies first.


#### Identifier generator

The event wrapper needs to be able to generate `EventId`s.
So we need an implementation of `SimpleES\EventSourcing\Identifier\GeneratesIdentifiers`.
And this library does _not_ provide one!

You can use the [Ramsey UUID Bridge](/bridges/ramsey-uuid),
which in turn uses [Ramsey UUID](https://github.com/ramsey/uuid) to generate (version 4) UUIDs.


#### Event-name resolver

An `EventEnvelope` requires the name of an event to convey the contract to the outside world.
But domain events in this library don't have the concept of a name, other than its class-name.

This library doesn't force you to use class-names, because it could well be that wouldn't make sense.
What if your events are consumed by another bounded context which uses different classes or even a different language?

So the event wrapper needs a way to resolve event-names, as it will wrap events in an envelope.

You can use a provided event-name resolver that maps the class-name to a name of your choice:

```php
use SimpleES\EventSourcing\Event\NameResolver\MappingEventNameResolver;

$map = [
    'BasketWasPickedUp'       => 'basket_was_picked_up',
    'ProductWasAddedToBasket' => 'product_was_added_to_basket'
];

$eventNameResolver = MappingEventNameResolver($map);
```

If you do want to stick to the class-name, this library also provides a solution:

```php
use SimpleES\EventSourcing\Event\NameResolver\ClassBasedEventNameResolver;

$eventNameResolver = new ClassBasedEventNameResolver();
```

You can also implement a custom event-name resolver,
as long as you adhere the `SimpleES\EventSourcing\Event\NameResolver\ResolvesEventNames` interface.


#### Event wrapper

Now that we have all dependencies for the event wrapper in place, we can create it:

```php
use SimpleES\EventSourcing\Event\Wrapper\EventWrapper;

$eventWrapper = new EventWrapper(
    $identifierGenerator,
    $eventNameResolver
);
```

By default the event wrapper will wrap events in envelopes of the class `SimpleES\EventSourcing\Event\Stream\EventEnvelope`.
But it can use any class that implements `SimpleES\EventSourcing\Event\Stream\EnvelopsEvent`.

You could create a custom event envelope, and specify its class-name as 3rd argument:

```php
use SimpleES\EventSourcing\Event\Wrapper\EventWrapper;

$eventWrapper = new EventWrapper(
    $identifierGenerator,
    $eventNameResolver,
    'CustomEventEnvelope'
);
```


#### Aggregate factory

Aggregates need to be reconstituted from their history.
This library provides a factory that takes the history, maps the identifier class-name to the aggregate class-name,
and reconstitutes it:

```php
use SimpleES\EventSourcing\Aggregate\Factory\MappingAggregateFactory;

$map = [
    'BasketId' => 'Basket'
];

$aggregateFactory = new MappingAggregateFactory($map);
```

If you're in need of a different approach,
implement `SimpleES\EventSourcing\Aggregate\Factory\ReconstitutesAggregates` to create your own factory.


#### Aggregate repository

Now we can proceed with the repository:

```php
use SimpleES\EventSourcing\Aggregate\Repository\AggregateRepository;

$repository = new AggregateRepository(
    $eventWrapper,
    $eventStore,
    $aggregateFactory
);
```

Wait, We haven't created an event store yet! This is covered in the [next section](/event-sourcing/event-store).


#### Identity map

Before we can create the aggregate manager itself, the only thing left is the identity map.
Creating it is fairly simple:

```php
use SimpleES\EventSourcing\IdentityMap\IdentityMap;

$identityMap = new IdentityMap();
```


#### Aggregate manager

Finally we can create the aggregate manager:

```php
use SimpleES\EventSourcing\Aggregate\Manager\AggregateManager;

$aggregateManager = new AggregateManager(
    $identityMap,
    $repository
);
```


### To sum it all up

```php
use SimpleES\EventSourcing\Aggregate\Factory\MappingAggregateFactory;
use SimpleES\EventSourcing\Aggregate\Manager\AggregateManager;
use SimpleES\EventSourcing\Aggregate\Repository\AggregateRepository;
use SimpleES\EventSourcing\Event\NameResolver\MappingEventNameResolver;
use SimpleES\EventSourcing\Event\Wrapper\EventWrapper;
use SimpleES\EventSourcing\IdentityMap\IdentityMap;

$identifierGenerator = // ...

$eventNameMap = [
    'BasketWasPickedUp'       => 'basket_was_picked_up',
    'ProductWasAddedToBasket' => 'product_was_added_to_basket'
];

$eventNameResolver = MappingEventNameResolver($eventNameMap);

$eventWrapper = new EventWrapper(
    $identifierGenerator,
    $eventNameResolver
);

$aggregateMap = [
    'BasketId' => 'Basket'
];

$aggregateFactory = new MappingAggregateFactory($aggregateMap);

$eventStore = // ...

$repository = new AggregateRepository(
    $eventWrapper,
    $eventStore,
    $aggregateFactory
);

$identityMap = new IdentityMap();

$aggregateManager = new AggregateManager(
    $identityMap,
    $repository
);
```
